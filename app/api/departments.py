from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, BadRequestException
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.department import Department
from app.models.user import User, UserRole

router = APIRouter(prefix="/departments", tags=["departments"])


class DepartmentCreate(BaseModel):
    name: str


class DepartmentUpdate(BaseModel):
    name: str


class DepartmentResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class AssignTeacherRequest(BaseModel):
    user_id: int
    department_id: int


@router.get("", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


@router.post("", response_model=DepartmentResponse, status_code=201)
async def create_department(
    req: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    existing = await db.execute(select(Department).where(Department.name == req.name))
    if existing.scalar_one_or_none():
        raise BadRequestException("Department already exists")
    dept = Department(name=req.name)
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    req: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise NotFoundException("Department not found")
    dept.name = req.name
    await db.commit()
    await db.refresh(dept)
    return dept


@router.delete("/{department_id}", status_code=204)
async def delete_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise NotFoundException("Department not found")
    await db.delete(dept)
    await db.commit()


@router.post("/assign")
async def assign_teacher(
    req: AssignTeacherRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    user_result = await db.execute(
        select(User).where(User.id == req.user_id, User.role == UserRole.teacher)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Teacher not found")

    dept_result = await db.execute(
        select(Department).where(Department.id == req.department_id)
    )
    dept = dept_result.scalar_one_or_none()
    if not dept:
        raise NotFoundException("Department not found")

    user.department_id = req.department_id
    await db.commit()
    return {"message": "Teacher assigned to department"}
