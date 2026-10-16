from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base, Entity


class DocumentSource(Base, Entity):
    __tablename__ = "ai_document_sources"
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    owner_email: Mapped[str] = mapped_column(String(320))
    document_id: Mapped[str] = mapped_column(String(36), index=True)
    version_id: Mapped[str] = mapped_column(String(100))
    revision: Mapped[str] = mapped_column(String(64))
    manifest: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("owner_id", "document_id", "version_id", "revision"),)


class DocumentIndex(Base, Entity):
    __tablename__ = "ai_document_indexes"
    source_id: Mapped[str] = mapped_column(
        ForeignKey("ai_document_sources.id", ondelete="CASCADE"), index=True
    )
    pipeline: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    markdown: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64))
    token_count: Mapped[int] = mapped_column(default=0)
    chunk_count: Mapped[int] = mapped_column(default=0)
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    error: Mapped[dict | None] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("source_id", "pipeline"),)
