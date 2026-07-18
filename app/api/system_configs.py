from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.system_config import SystemConfig
from app.models.user import User, UserRole

router = APIRouter(prefix="/system-configs", tags=["system-configs"])


class SystemConfigResponse(BaseModel):
    system_prompt: str = ""
    model_name: str = ""
    temperature: float = 0.7
    max_materials: int = 5
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    max_tokens: int = 4096

    model_config = {"from_attributes": True}


class SystemConfigUpdate(BaseModel):
    system_prompt: str | None = None
    model_name: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_materials: int | None = Field(default=None, ge=1, le=50)
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)
    frequency_penalty: float | None = Field(default=None, ge=-2.0, le=2.0)
    presence_penalty: float | None = Field(default=None, ge=-2.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1, le=128000)


async def get_or_create_config(db: AsyncSession) -> SystemConfig:
    result = await db.execute(select(SystemConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = SystemConfig()
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@router.get("", response_model=SystemConfigResponse)
async def get_system_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    config = await get_or_create_config(db)
    return config


@router.put("", response_model=SystemConfigResponse)
async def update_system_config(
    req: SystemConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    config = await get_or_create_config(db)
    if req.system_prompt is not None:
        config.system_prompt = req.system_prompt
    if req.model_name is not None:
        config.model_name = req.model_name
    if req.max_materials is not None:
        config.max_materials = req.max_materials
    if req.temperature is not None:
        config.temperature = req.temperature
    if req.top_p is not None:
        config.top_p = req.top_p
    if req.frequency_penalty is not None:
        config.frequency_penalty = req.frequency_penalty
    if req.presence_penalty is not None:
        config.presence_penalty = req.presence_penalty
    if req.max_tokens is not None:
        config.max_tokens = req.max_tokens
    await db.commit()
    await db.refresh(config)
    return config
