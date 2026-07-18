from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.database import get_db
from app.dependencies import get_current_user
from app.models.uni_info import UniInfo, UniInfoCategory
from app.models.user import User, UserRole

router = APIRouter(prefix="/uni-info", tags=["uni-info"])
logger = structlog.get_logger()


class CreateUniInfoRequest(BaseModel):
    category: UniInfoCategory
    title: str
    content: str
    metadata_json: dict | None = None


async def require_teacher_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [UserRole.teacher, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Only teachers can manage uni info")
    return current_user


@router.post("/")
async def create_uni_info(
    body: CreateUniInfoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    uni_info = UniInfo(
        teacher_id=current_user.id,
        category=body.category,
        title=body.title,
        content=body.content,
        metadata_json=body.metadata_json,
    )
    logger.info(uni_info)

    db.add(uni_info)
    await db.commit()
    await db.refresh(uni_info)
    return {"id": uni_info.id, "message": "Uni info created"}


@router.get("/")
async def list_uni_info(
    category: UniInfoCategory | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(UniInfo)
    if category:
        query = query.where(UniInfo.category == category)
    query = query.order_by(UniInfo.created_at.desc())

    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": item.id,
            "category": item.category.value,
            "title": item.title,
            "content": item.content,
            "metadata": item.metadata_json,
            "teacher_id": item.teacher_id,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]


@router.get("/{uni_info_id}")
async def get_uni_info(
    uni_info_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(UniInfo).where(UniInfo.id == uni_info_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Uni info not found")

    return {
        "id": item.id,
        "category": item.category.value,
        "title": item.title,
        "content": item.content,
        "metadata": item.metadata_json,
        "teacher_id": item.teacher_id,
        "created_at": item.created_at.isoformat(),
    }


@router.put("/{uni_info_id}")
async def update_uni_info(
    uni_info_id: int,
    category: UniInfoCategory | None = None,
    title: str | None = None,
    content: str | None = None,
    metadata_json: dict | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    result = await db.execute(select(UniInfo).where(UniInfo.id == uni_info_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Uni info not found")

    if item.teacher_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this entry")

    if category is not None:
        item.category = category
    if title is not None:
        item.title = title
    if content is not None:
        item.content = content
    if metadata_json is not None:
        item.metadata_json = metadata_json

    await db.commit()
    return {"message": "Uni info updated"}


@router.delete("/{uni_info_id}")
async def delete_uni_info(
    uni_info_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    result = await db.execute(select(UniInfo).where(UniInfo.id == uni_info_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Uni info not found")
    
    if item.teacher_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    await db.delete(item)
    await db.commit()
    return {"message": "Uni info deleted"}
