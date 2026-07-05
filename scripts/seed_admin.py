"""
Seed script to create the first admin user.
Run once: python scripts/seed_admin.py
"""
import asyncio
import os
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.database import async_session
from app.models.user import User, UserRole


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@fabula.com")
    password = os.environ.get("ADMIN_PASSWORD", "Admin123")
    name = os.environ.get("ADMIN_NAME", "System Admin")

    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print(f"Admin already exists: {existing_admin.email}")
            sys.exit(1)

        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"Email already taken: {email}")
            sys.exit(1)

        admin = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            role=UserRole.admin,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print(f"Admin created: {admin.email} (id={admin.id})")


if __name__ == "__main__":
    asyncio.run(seed_admin())
