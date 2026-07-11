import structlog
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_user
from app.models.note import Note
from app.models.user import User
from app.services.notes import generate_notes

logger = structlog.get_logger()
router = APIRouter(prefix="/notes", tags=["notes"])


async def generate_notes_background(
    material_id: int, user_id: int, db_session_factory
):
    """Background task to generate notes."""
    async with db_session_factory() as db:
        try:
            await generate_notes(material_id, user_id, db)
            logger.info("Notes generation completed", material_id=material_id)
        except Exception as e:
            logger.error("Notes generation failed", error=str(e), material_id=material_id)


@router.post("/generate/{material_id}", status_code=202)
async def generate_notes_endpoint(
    material_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate study notes from a material (async)."""
    from app.database import async_session

    # Verify material exists
    result = await db.execute(
        select(Note).where(Note.material_id == material_id, Note.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"message": "Notes already exist", "note_id": existing.id}

    background_tasks.add_task(generate_notes_background, material_id, current_user.id, async_session)
    return {"message": "Notes generation started", "material_id": material_id}


@router.get("/material/{material_id}")
async def get_notes_by_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notes for a specific material."""
    result = await db.execute(
        select(Note).where(Note.material_id == material_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundException("Notes not found")
    
    return {
        "id": note.id,
        "material_id": note.material_id,
        "content": note.content,
        "created_at": note.created_at.isoformat(),
    }


@router.get("/{note_id}")
async def get_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific note by ID."""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundException("Note not found")
    
    return {
        "id": note.id,
        "material_id": note.material_id,
        "content": note.content,
        "created_at": note.created_at.isoformat(),
    }


@router.get("")
async def list_notes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all notes for the current user."""
    result = await db.execute(
        select(Note).where(Note.user_id == current_user.id).order_by(Note.created_at.desc())
    )
    notes = result.scalars().all()
    
    return [
        {
            "id": note.id,
            "material_id": note.material_id,
            "content": note.content[:200] + "..." if len(note.content) > 200 else note.content,
            "created_at": note.created_at.isoformat(),
        }
        for note in notes
    ]


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a note."""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundException("Note not found")
    
    await db.delete(note)
    await db.commit()
