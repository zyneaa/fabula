import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Chunk, Material
from app.models.note import Note
from app.services.llm import generate_with_student_config

logger = structlog.get_logger()


async def generate_notes(
    material_id: int, user_id: int, db: AsyncSession
) -> Note:
    """Generate study notes from material chunks using LLM."""
    
    # Fetch material
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise ValueError(f"Material {material_id} not found")
    
    # Fetch chunks
    result = await db.execute(
        select(Chunk)
        .where(Chunk.material_id == material_id)
        .order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    
    if not chunks:
        raise ValueError(f"No chunks found for material {material_id}")
    
    # Combine chunks into content
    content = "\n\n".join([chunk.text for chunk in chunks])
    
    # Generate notes using LLM
    messages = [
        {
            "role": "system",
            "content": "You are an expert educator creating comprehensive study notes. Generate well-structured, detailed notes from the provided material. Use clear headings, bullet points, and examples where appropriate. Format in markdown.",
        },
        {
            "role": "user",
            "content": f"Generate comprehensive study notes from the following material:\n\n{content}",
        },
    ]
    
    notes_content = await generate_with_student_config(messages, user_id, db)
    
    # Save to database
    note = Note(material_id=material_id, user_id=user_id, content=notes_content)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    
    logger.info(
        "Generated notes",
        material_id=material_id,
        user_id=user_id,
        note_id=note.id,
    )
    
    return note
