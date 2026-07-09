from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ForbiddenException
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.llm_config import LLMConfig, StudentLLMConfig
from app.models.user import User, UserRole

router = APIRouter(prefix="/llm-configs", tags=["llm-configs"])


class LLMConfigCreate(BaseModel):
    name: str
    provider: str = Field(default="openrouter")
    model_name: str
    is_active: bool = True
    max_tokens: int | None = None
    restrictions: dict | None = None


class LLMConfigResponse(BaseModel):
    id: int
    teacher_id: int
    name: str
    provider: str
    model_name: str
    is_active: bool
    max_tokens: int | None
    restrictions: dict | None


class LLMConfigUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    max_tokens: int | None = None
    restrictions: dict | None = None


class AssignConfigRequest(BaseModel):
    student_id: int
    config_id: int


class StudentConfigResponse(BaseModel):
    id: int
    student_id: int
    config_id: int
    teacher_id: int
    assigned_at: str
    config: LLMConfigResponse


@router.post("", response_model=LLMConfigResponse, status_code=201)
async def create_config(
    req: LLMConfigCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    config = LLMConfig(
        teacher_id=teacher.id,
        name=req.name,
        provider=req.provider,
        model_name=req.model_name,
        is_active=req.is_active,
        max_tokens=req.max_tokens,
        restrictions=req.restrictions,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return LLMConfigResponse(
        id=config.id,
        teacher_id=config.teacher_id,
        name=config.name,
        provider=config.provider,
        model_name=config.model_name,
        is_active=config.is_active,
        max_tokens=config.max_tokens,
        restrictions=config.restrictions,
    )


@router.get("", response_model=list[LLMConfigResponse])
async def list_configs(
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    result = await db.execute(
        select(LLMConfig).where(LLMConfig.teacher_id == teacher.id)
    )
    configs = result.scalars().all()
    return [
        LLMConfigResponse(
            id=c.id,
            teacher_id=c.teacher_id,
            name=c.name,
            provider=c.provider,
            model_name=c.model_name,
            is_active=c.is_active,
            max_tokens=c.max_tokens,
            restrictions=c.restrictions,
        )
        for c in configs
    ]


@router.get("/{config_id}", response_model=LLMConfigResponse)
async def get_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    result = await db.execute(
        select(LLMConfig).where(
            LLMConfig.id == config_id,
            LLMConfig.teacher_id == teacher.id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise NotFoundException("Config not found")
    return LLMConfigResponse(
        id=config.id,
        teacher_id=config.teacher_id,
        name=config.name,
        provider=config.provider,
        model_name=config.model_name,
        is_active=config.is_active,
        max_tokens=config.max_tokens,
        restrictions=config.restrictions,
    )


@router.put("/{config_id}", response_model=LLMConfigResponse)
async def update_config(
    config_id: int,
    req: LLMConfigUpdate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    result = await db.execute(
        select(LLMConfig).where(
            LLMConfig.id == config_id,
            LLMConfig.teacher_id == teacher.id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise NotFoundException("Config not found")

    if req.name is not None:
        config.name = req.name
    if req.is_active is not None:
        config.is_active = req.is_active
    if req.max_tokens is not None:
        config.max_tokens = req.max_tokens
    if req.restrictions is not None:
        config.restrictions = req.restrictions

    await db.commit()
    await db.refresh(config)
    return LLMConfigResponse(
        id=config.id,
        teacher_id=config.teacher_id,
        name=config.name,
        provider=config.provider,
        model_name=config.model_name,
        is_active=config.is_active,
        max_tokens=config.max_tokens,
        restrictions=config.restrictions,
    )


@router.delete("/{config_id}", status_code=204)
async def delete_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    result = await db.execute(
        select(LLMConfig).where(
            LLMConfig.id == config_id,
            LLMConfig.teacher_id == teacher.id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise NotFoundException("Config not found")
    await db.delete(config)
    await db.commit()


async def get_active_config(teacher_id: int, db: AsyncSession) -> LLMConfig | None:
    result = await db.execute(
        select(LLMConfig)
        .where(
            LLMConfig.teacher_id == teacher_id,
            LLMConfig.is_active == True,
        )
        .order_by(LLMConfig.created_at.desc())
    )
    return result.scalar_one_or_none()


@router.post("/assign", response_model=StudentConfigResponse, status_code=201)
async def assign_config_to_student(
    req: AssignConfigRequest,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    config_result = await db.execute(
        select(LLMConfig).where(
            LLMConfig.id == req.config_id,
            LLMConfig.teacher_id == teacher.id,
        )
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise NotFoundException("Config not found")

    student_result = await db.execute(
        select(User).where(
            User.id == req.student_id,
            User.role == UserRole.student,
        )
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise NotFoundException("Student not found")

    existing_result = await db.execute(
        select(StudentLLMConfig).where(
            StudentLLMConfig.student_id == req.student_id,
            StudentLLMConfig.config_id == req.config_id,
        )
    )
    if existing_result.scalar_one_or_none():
        raise ForbiddenException("Config already assigned to this student")

    assignment = StudentLLMConfig(
        student_id=req.student_id,
        config_id=req.config_id,
        teacher_id=teacher.id,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return StudentConfigResponse(
        id=assignment.id,
        student_id=assignment.student_id,
        config_id=assignment.config_id,
        teacher_id=assignment.teacher_id,
        assigned_at=assignment.assigned_at.isoformat(),
        config=LLMConfigResponse(
            id=config.id,
            teacher_id=config.teacher_id,
            name=config.name,
            provider=config.provider,
            model_name=config.model_name,
            is_active=config.is_active,
            max_tokens=config.max_tokens,
            restrictions=config.restrictions,
        ),
    )


@router.get("/student/{student_id}", response_model=list[StudentConfigResponse])
async def list_student_configs(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    student_result = await db.execute(
        select(User).where(
            User.id == student_id,
            User.role == UserRole.student,
        )
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise NotFoundException("Student not found")

    result = await db.execute(
        select(StudentLLMConfig)
        .where(StudentLLMConfig.student_id == student_id)
        .order_by(StudentLLMConfig.assigned_at.desc())
    )
    assignments = result.scalars().all()

    responses = []
    for assignment in assignments:
        config_result = await db.execute(
            select(LLMConfig).where(LLMConfig.id == assignment.config_id)
        )
        config = config_result.scalar_one_or_none()
        if config:
            responses.append(
                StudentConfigResponse(
                    id=assignment.id,
                    student_id=assignment.student_id,
                    config_id=assignment.config_id,
                    teacher_id=assignment.teacher_id,
                    assigned_at=assignment.assigned_at.isoformat(),
                    config=LLMConfigResponse(
                        id=config.id,
                        teacher_id=config.teacher_id,
                        name=config.name,
                        provider=config.provider,
                        model_name=config.model_name,
                        is_active=config.is_active,
                        max_tokens=config.max_tokens,
                        restrictions=config.restrictions,
                    ),
                )
            )

    return responses


@router.delete("/assign/{assignment_id}", status_code=204)
async def remove_config_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    result = await db.execute(
        select(StudentLLMConfig).where(
            StudentLLMConfig.id == assignment_id,
            StudentLLMConfig.teacher_id == teacher.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise NotFoundException("Assignment not found")
    await db.delete(assignment)
    await db.commit()


async def get_student_active_config(
    student_id: int, db: AsyncSession
) -> LLMConfig | None:
    result = await db.execute(
        select(LLMConfig)
        .join(StudentLLMConfig, StudentLLMConfig.config_id == LLMConfig.id)
        .where(
            StudentLLMConfig.student_id == student_id,
            LLMConfig.is_active == True,
        )
        .order_by(StudentLLMConfig.assigned_at.desc())
    )
    return result.scalars().first()
