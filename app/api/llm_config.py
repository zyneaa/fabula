from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.llm_config import LLMConfig
from app.models.user import User, UserRole

router = APIRouter(prefix="/llm-configs", tags=["llm-configs"])


class LLMConfigCreate(BaseModel):
    provider: str = Field(default="openrouter")
    model_name: str
    is_active: bool = True
    max_tokens: int | None = None
    restrictions: dict | None = None


class LLMConfigResponse(BaseModel):
    id: int
    teacher_id: int
    provider: str
    model_name: str
    is_active: bool
    max_tokens: int | None
    restrictions: dict | None


class LLMConfigUpdate(BaseModel):
    is_active: bool | None = None
    max_tokens: int | None = None
    restrictions: dict | None = None


@router.post("", response_model=LLMConfigResponse, status_code=201)
async def create_config(
    req: LLMConfigCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.teacher)),
):
    config = LLMConfig(
        teacher_id=teacher.id,
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
        select(LLMConfig).where(
            LLMConfig.teacher_id == teacher_id,
            LLMConfig.is_active == True,
        ).order_by(LLMConfig.created_at.desc())
    )
    return result.scalar_one_or_none()
