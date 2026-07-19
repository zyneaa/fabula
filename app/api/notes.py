import structlog
from fastapi import APIRouter, Depends
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


@router.post("/generate/conversation/{conversation_id}")
async def generate_notes_endpoint(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate study notes from conversation materials."""
    await generate_notes(conversation_id, current_user.id, db)
    return {"message": "Notes generation complete", "conversation_id": conversation_id}


@router.get("/conversation/{conversation_id}")
async def get_notes_by_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notes for a specific conversation."""
    # Notes are tied to materials, but we want to get notes for all materials in a conversation
    from app.models.material import Material
    
    # Get all materials for this conversation
    materials_result = await db.execute(
        select(Material).where(
            Material.conversation_id == conversation_id,
            Material.user_id == current_user.id,
        )
    )
    materials = materials_result.scalars().all()
    
    if not materials:
        raise NotFoundException("No materials found for this conversation")
    
    # Get notes for any of these materials
    material_ids = [m.id for m in materials]
    result = await db.execute(
        select(Note).where(
            Note.material_id.in_(material_ids),
            Note.user_id == current_user.id,
        ).order_by(Note.created_at.desc())
    )
    notes = result.scalars().all()
    
    if not notes:
        raise NotFoundException("No notes found for this conversation")
    
    return [
        {
            "id": note.id,
            "material_id": note.material_id,
            "content": note.content,
            "created_at": note.created_at.isoformat(),
        }
        for note in notes
    ]


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
