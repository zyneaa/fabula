from datetime import datetime

from sqlalchemy import Text, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    temperature: Mapped[float] = mapped_column(default=0.7)
    top_p: Mapped[float] = mapped_column(default=1.0)
    frequency_penalty: Mapped[float] = mapped_column(default=0.0)
    presence_penalty: Mapped[float] = mapped_column(default=0.0)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
