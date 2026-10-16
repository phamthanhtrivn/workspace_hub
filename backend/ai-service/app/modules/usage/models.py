from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base, Entity


class ModelCall(Base, Entity):
    __tablename__ = "ai_model_calls"
    job_id: Mapped[str] = mapped_column(ForeignKey("ai_jobs.id", ondelete="CASCADE"), index=True)
    model: Mapped[str] = mapped_column(String(100))
    operation: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="STARTED")
    input_tokens: Mapped[int] = mapped_column(default=0)
    output_tokens: Mapped[int] = mapped_column(default=0)
