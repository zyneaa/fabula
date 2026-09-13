from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExamPaperJob(Base):
    __tablename__ = "exam_paper_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending|running|done|failed
    num_papers: Mapped[int] = mapped_column(Integer, default=3)
    error: Mapped[str | None] = mapped_column(Text)
    results: Mapped[list | None] = mapped_column(JSON)  # [{id, paper_number, content, created_at}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
