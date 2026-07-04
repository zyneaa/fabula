import os
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.dependencies import get_current_user, get_upload_file
from app.models.material import Chunk, Material, MaterialStatus
from app.models.user import User
from app.services.chunker import chunk_text, estimate_tokens
from app.services.file_parser import parse_file

router = APIRouter(prefix="/materials", tags=["materials"])

ALLOWED_TYPES = {".pdf", ".docx", ".pptx", ".txt"}


class MaterialResponse(BaseModel):
    id: int
    title: str
    file_type: str
    status: MaterialStatus
    uploaded_at: str


class MaterialDetailResponse(MaterialResponse):
    chunks: list[dict]


async def process_material(material_id: int, file_path: str):
    from app.database import async_session

    async with async_session() as db:
        result = await db.execute(select(Material).where(Material.id == material_id))
        material = result.scalar_one_or_none()
        if not material:
            return

        try:
            material.status = MaterialStatus.processing
            await db.commit()

            text = parse_file(file_path)
            chunks = chunk_text(text)

            for i, chunk in enumerate(chunks):
                db.add(Chunk(
                    material_id=material_id,
                    text=chunk,
                    chunk_index=i,
                    token_count=estimate_tokens(chunk),
                ))

            material.status = MaterialStatus.ready
            await db.commit()
        except Exception:
            material.status = MaterialStatus.failed
            await db.commit()
            raise


@router.post("", response_model=MaterialResponse, status_code=201)
async def upload_material(
    background_tasks: BackgroundTasks,
    file: UploadFile = Depends(get_upload_file),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filename = file.filename
    assert filename is not None

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise BadRequestException(f"Unsupported file type: {ext}")

    content = await file.read()
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_size:
        raise BadRequestException(f"File too large (max {settings.MAX_UPLOAD_SIZE_MB}MB)")

    user_dir = Path(settings.UPLOAD_DIR) / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    file_path = user_dir / f"{os.urandom(8).hex()}{ext}"
    file_path.write_bytes(content)

    material = Material(
        user_id=user.id,
        title=file.filename,
        file_path=str(file_path),
        file_type=ext[1:],
        status=MaterialStatus.pending,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)

    background_tasks.add_task(process_material, material.id, str(file_path))

    return MaterialResponse(
        id=material.id,
        title=material.title,
        file_type=material.file_type,
        status=material.status,
        uploaded_at=material.uploaded_at.isoformat(),
    )


@router.get("", response_model=list[MaterialResponse])
async def list_materials(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Material).where(Material.user_id == user.id).order_by(Material.uploaded_at.desc())
    )
    materials = result.scalars().all()
    return [
        MaterialResponse(
            id=m.id,
            title=m.title,
            file_type=m.file_type,
            status=m.status,
            uploaded_at=m.uploaded_at.isoformat(),
        )
        for m in materials
    ]


@router.get("/{material_id}", response_model=MaterialDetailResponse)
async def get_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise NotFoundException("Material not found")
    if material.user_id != user.id:
        raise NotFoundException("Material not found")

    chunks_result = await db.execute(
        select(Chunk).where(Chunk.material_id == material_id).order_by(Chunk.chunk_index)
    )
    chunks = [{"index": c.chunk_index, "text": c.text, "tokens": c.token_count} for c in chunks_result.scalars().all()]

    return MaterialDetailResponse(
        id=material.id,
        title=material.title,
        file_type=material.file_type,
        status=material.status,
        uploaded_at=material.uploaded_at.isoformat(),
        chunks=chunks,
    )


@router.delete("/{material_id}", status_code=204)
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise NotFoundException("Material not found")
    if material.user_id != user.id:
        raise NotFoundException("Material not found")

    Path(material.file_path).unlink(missing_ok=True)
    await db.delete(material)
    await db.commit()
