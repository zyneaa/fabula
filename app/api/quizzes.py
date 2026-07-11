import structlog
from fastapi import APIRouter, BackgroundTasks, Depends
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


async def generate_quiz_background(
    material_id: int, user_id: int, db_session_factory
):
    """Background task to generate quiz."""
    async with db_session_factory() as db:
        try:
            await generate_quiz(material_id, user_id, db)
            logger.info("Quiz generation completed", material_id=material_id)
        except Exception as e:
            logger.error("Quiz generation failed", error=str(e), material_id=material_id)


@router.post("/generate/{material_id}", status_code=202)
async def generate_quiz_endpoint(
    material_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate quiz from a material (async)."""
    from app.database import async_session

    # Check if quiz already exists
    result = await db.execute(
        select(Quiz).where(Quiz.material_id == material_id, Quiz.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"message": "Quiz already exists", "quiz_id": existing.id}

    background_tasks.add_task(generate_quiz_background, material_id, current_user.id, async_session)
    return {"message": "Quiz generation started", "material_id": material_id}


@router.get("/material/{material_id}")
async def get_quiz_by_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get quiz for a specific material."""
    result = await db.execute(
        select(Quiz).where(Quiz.material_id == material_id, Quiz.user_id == current_user.id)
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
