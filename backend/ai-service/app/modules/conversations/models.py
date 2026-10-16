from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base, Entity


class Conversation(Base, Entity):
    __tablename__ = "ai_conversations"
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(200))
    deleted: Mapped[bool] = mapped_column(default=False)
    sequence: Mapped[int] = mapped_column(default=0)


class ConversationSource(Base):
    __tablename__ = "ai_conversation_sources"
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="CASCADE"), primary_key=True
    )
    index_id: Mapped[str] = mapped_column(ForeignKey("ai_document_indexes.id"), primary_key=True)


class Message(Base, Entity):
    __tablename__ = "ai_messages"
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True
    )
    sequence: Mapped[int]
    role: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text, default="")
    reply_to_id: Mapped[str | None] = mapped_column(ForeignKey("ai_messages.id"))
    generation_job_id: Mapped[str | None] = mapped_column(ForeignKey("ai_jobs.id"), unique=True)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    answer_status: Mapped[str | None] = mapped_column(String(40))
    __table_args__ = (UniqueConstraint("conversation_id", "sequence"),)
