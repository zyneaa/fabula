from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException
from app.core.security import hash_password
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole

router = APIRouter(prefix="/users", tags=["users"])


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)
    role: UserRole
    department: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("must contain uppercase letter and number")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    department: str | None
    major: str | None = None
    year: int | None = None
    department_id: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


def check_can_create_user(current_user: User, target_role: UserRole):
    if current_user.role == UserRole.student:
        raise ForbiddenException("Students cannot create users")

    if current_user.role == UserRole.teacher:
        if target_role != UserRole.student:
            raise ForbiddenException("Teachers can only create students")

    if current_user.role == UserRole.admin:
        if target_role == UserRole.admin:
            pass


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    req: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_can_create_user(current_user, req.role)

    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise BadRequestException("Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        role=req.role,
        department=req.department,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return users


class UpdateStudentRequest(BaseModel):
    major: str | None = None
    year: int | None = None


@router.patch("/{user_id}", response_model=UserResponse)
async def update_student(
    user_id: int,
    req: UpdateStudentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise BadRequestException("User not found")
    if req.major is not None:
        user.major = req.major
    if req.year is not None:
        user.year = req.year
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/students", response_model=list[UserResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
):
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.student)
        .order_by(User.created_at.desc())
    )
    students = result.scalars().all()
    return students
