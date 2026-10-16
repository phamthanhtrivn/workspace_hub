from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base, Entity, now


class Job(Base, Entity):
    __tablename__ = "ai_jobs"
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("ai_jobs.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="QUEUED")
    stage: Mapped[str] = mapped_column(String(30), default="QUEUED")
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[dict | None] = mapped_column(JSON)
    attempts: Mapped[int] = mapped_column(default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    lease_token: Mapped[str | None] = mapped_column(String(36))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (Index("ix_ai_jobs_queue", "status", "available_at"),)
