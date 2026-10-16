from sqlalchemy import JSON, REAL, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base, Entity


class Chunk(Base, Entity):
    __tablename__ = "ai_document_chunks"
    index_id: Mapped[str] = mapped_column(
        ForeignKey("ai_document_indexes.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    content: Mapped[str] = mapped_column(Text)
    locator: Mapped[dict] = mapped_column(JSON)
    embedding: Mapped[list | None] = mapped_column(
        ARRAY(REAL).with_variant(JSON(none_as_null=True), "sqlite")
    )
    embedding_model: Mapped[str] = mapped_column(String(100))
    __table_args__ = (UniqueConstraint("index_id", "position"),)
