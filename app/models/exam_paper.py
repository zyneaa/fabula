from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class ExamPaper(Base):
    __tablename__ = "exam_papers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    course_id: Mapped[str] = mapped_column(String(255), index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_exam_id: Mapped[int | None] = mapped_column(ForeignKey("materials.id"))
    paper_number: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    style_profile: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
