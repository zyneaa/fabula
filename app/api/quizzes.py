import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_user
from app.models.quiz import Quiz
from app.models.user import User
from app.services.quiz import generate_quiz

logger = structlog.get_logger()
router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.post("/generate/conversation/{conversation_id}")
async def generate_quiz_endpoint(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate quiz from conversation materials."""
    await generate_quiz(conversation_id, current_user.id, db)
    return {"message": "Quiz generation complete", "conversation_id": conversation_id}


@router.get("/conversation/{conversation_id}")
async def get_quiz_by_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get quiz for a specific conversation."""
    # Quizzes are tied to materials, but we want to get quizzes for all materials in a conversation
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
    
    # Get quizzes for any of these materials
    material_ids = [m.id for m in materials]
    result = await db.execute(
        select(Quiz).where(
            Quiz.material_id.in_(material_ids),
            Quiz.user_id == current_user.id,
        ).order_by(Quiz.created_at.desc())
    )
    quizzes = result.scalars().all()
    
    if not quizzes:
        raise NotFoundException("No quizzes found for this conversation")
    
    return [
        {
            "id": quiz.id,
            "material_id": quiz.material_id,
            "questions": quiz.questions,
            "created_at": quiz.created_at.isoformat(),
        }
        for quiz in quizzes
    ]


@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific quiz by ID."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == current_user.id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundException("Quiz not found")
    
    return {
        "id": quiz.id,
        "material_id": quiz.material_id,
        "questions": quiz.questions,
        "created_at": quiz.created_at.isoformat(),
    }


@router.get("")
async def list_quizzes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all quizzes for the current user."""
    result = await db.execute(
        select(Quiz).where(Quiz.user_id == current_user.id).order_by(Quiz.created_at.desc())
    )
    quizzes = result.scalars().all()
    
    return [
        {
            "id": quiz.id,
            "material_id": quiz.material_id,
            "question_count": len(quiz.questions.get("questions", [])),
            "created_at": quiz.created_at.isoformat(),
        }
        for quiz in quizzes
    ]


@router.delete("/{quiz_id}", status_code=204)
async def delete_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a quiz."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == current_user.id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundException("Quiz not found")
    
    await db.delete(quiz)
    await db.commit()
