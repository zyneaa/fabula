import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class UniInfoCategory(str, enum.Enum):
    timetable = "timetable"
    event = "event"
    directory = "directory"
    course = "course"


class UniInfo(Base):
    __tablename__ = "uni_info"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[UniInfoCategory] = mapped_column(Enum(UniInfoCategory), index=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
