from fastapi import Depends, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ForbiddenException,
    UnauthorizedException,
    BadRequestException,
)
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedException("User not found")
    return user


async def get_upload_file(file: UploadFile = File(...)) -> UploadFile:
    if not file.filename:
        raise BadRequestException("Filename required")
    return file


def require_role(*roles: UserRole):
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenException(
                f"Requires role: {', '.join(r.value for r in roles)}"
            )
        return user

    return role_checker
