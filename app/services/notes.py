import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Chunk, Material, MaterialStatus
from app.models.note import Note
from app.services.llm import generate_with_student_config

logger = structlog.get_logger()


async def generate_notes(
    conversation_id: int,
    user_id: int,
    db: AsyncSession,
    title: str = "Study Notes",
) -> Note:
    """Generate study notes from conversation materials using LLM."""
    
    # Fetch ready materials for this conversation
    result = await db.execute(
        select(Material).where(
            Material.conversation_id == conversation_id,
            Material.user_id == user_id,
            Material.status == MaterialStatus.ready,
        )
    )
    materials = result.scalars().all()
    
    if not materials:
        raise ValueError(f"No ready materials found for conversation {conversation_id}")
    
    # Fetch all chunks from all materials
    all_chunks = []
    for material in materials:
        result = await db.execute(
            select(Chunk)
            .where(Chunk.material_id == material.id)
            .order_by(Chunk.chunk_index)
        )
        chunks = result.scalars().all()
        all_chunks.extend(chunks)
    
    if not all_chunks:
        raise ValueError(f"No chunks found for materials in conversation {conversation_id}")
    
    # Combine chunks into content
    content = "\n\n".join([chunk.text for chunk in all_chunks])
    
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
    
    # Save to database (notes are tied to conversation, not individual material)
    # We'll use the first material_id for backwards compatibility, but the note is for the conversation
    note = Note(
        material_id=materials[0].id,
        user_id=user_id,
        content=notes_content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    
    logger.info(
        "Generated notes",
        conversation_id=conversation_id,
        user_id=user_id,
        note_id=note.id,
        material_count=len(materials),
    )
    
    return note
