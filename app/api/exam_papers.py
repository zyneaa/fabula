import structlog
from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.exam_paper import ExamPaper
from app.models.user import User, UserRole
from app.services.exam_paper import generate_exam_papers

logger = structlog.get_logger()
router = APIRouter(prefix="/exam-papers", tags=["exam-papers"])


class GenerateExamPapersRequest(BaseModel):
    course_material_id: int
    source_exam_id: int | None = None
    course_id: str
    num_papers: int = 5


async def generate_exam_papers_background(
    course_material_id: int,
    source_exam_id: int | None,
    teacher_id: int,
    course_id: str,
    num_papers: int,
    db_session_factory,
):
    """Background task to generate exam papers."""
    async with db_session_factory() as db:
        try:
            await generate_exam_papers(
                course_material_id, source_exam_id, teacher_id, course_id, num_papers, db
            )
            logger.info("Exam papers generation completed", course_id=course_id)
        except Exception as e:
            logger.error("Exam papers generation failed", error=str(e), course_id=course_id)


@router.post("/generate", status_code=202)
async def generate_exam_papers_endpoint(
    req: GenerateExamPapersRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    """Generate multiple exam papers from course material (async)."""
    from app.database import async_session

    background_tasks.add_task(
        generate_exam_papers_background,
        req.course_material_id,
        req.source_exam_id,
        current_user.id,
        req.course_id,
        req.num_papers,
        async_session,
    )
    return {
        "message": "Exam papers generation started",
        "course_id": req.course_id,
        "num_papers": req.num_papers,
    }


@router.get("/course/{course_id}")
async def get_exam_papers_by_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    """Get all exam papers for a specific course."""
    result = await db.execute(
        select(ExamPaper)
        .where(ExamPaper.course_id == course_id, ExamPaper.teacher_id == current_user.id)
        .order_by(ExamPaper.paper_number)
    )
    papers = result.scalars().all()

    return [
        {
            "id": paper.id,
            "course_id": paper.course_id,
            "paper_number": paper.paper_number,
            "content": paper.content[:300] + "..." if len(paper.content) > 300 else paper.content,
            "style_profile": paper.style_profile,
            "created_at": paper.created_at.isoformat(),
        }
        for paper in papers
    ]


@router.get("/{paper_id}")
async def get_exam_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    """Get a specific exam paper by ID."""
    result = await db.execute(
        select(ExamPaper).where(
            ExamPaper.id == paper_id, ExamPaper.teacher_id == current_user.id
        )
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise NotFoundException("Exam paper not found")

    return {
        "id": paper.id,
        "course_id": paper.course_id,
        "paper_number": paper.paper_number,
        "content": paper.content,
        "style_profile": paper.style_profile,
        "created_at": paper.created_at.isoformat(),
    }


@router.get("")
async def list_exam_papers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    """List all exam papers for the current teacher."""
    result = await db.execute(
        select(ExamPaper)
        .where(ExamPaper.teacher_id == current_user.id)
        .order_by(ExamPaper.created_at.desc())
    )
    papers = result.scalars().all()

    return [
        {
            "id": paper.id,
            "course_id": paper.course_id,
            "paper_number": paper.paper_number,
            "content": paper.content[:300] + "..." if len(paper.content) > 300 else paper.content,
            "created_at": paper.created_at.isoformat(),
        }
        for paper in papers
    ]


@router.delete("/{paper_id}", status_code=204)
async def delete_exam_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    """Delete an exam paper."""
    result = await db.execute(
        select(ExamPaper).where(
            ExamPaper.id == paper_id, ExamPaper.teacher_id == current_user.id
        )
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise NotFoundException("Exam paper not found")
    
    await db.delete(paper)
    await db.commit()
