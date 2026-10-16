"""Document QA sources, versioned indexes, conversations and durable jobs."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY

revision = "0001_document_qa"
down_revision = None
branch_labels = depends_on = None


def entity():
    return [
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade():
    op.create_table(
        "ai_document_sources",
        *entity(),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("owner_email", sa.String(320), nullable=False),
        sa.Column("document_id", sa.String(36), nullable=False),
        sa.Column("version_id", sa.String(100), nullable=False),
        sa.Column("revision", sa.String(64), nullable=False),
        sa.Column("manifest", sa.JSON, nullable=False),
        sa.UniqueConstraint("owner_id", "document_id", "version_id", "revision"),
    )
    op.create_table(
        "ai_document_indexes",
        *entity(),
        sa.Column(
            "source_id",
            sa.String(36),
            sa.ForeignKey("ai_document_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pipeline", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("markdown", sa.Text),
        sa.Column("content_hash", sa.String(64)),
        sa.Column("token_count", sa.Integer, nullable=False),
        sa.Column("chunk_count", sa.Integer, nullable=False),
        sa.Column("warnings", sa.JSON, nullable=False),
        sa.Column("error", sa.JSON),
        sa.UniqueConstraint("source_id", "pipeline"),
    )
    op.create_table(
        "ai_document_chunks",
        *entity(),
        sa.Column(
            "index_id",
            sa.String(36),
            sa.ForeignKey("ai_document_indexes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("locator", sa.JSON, nullable=False),
        sa.Column("embedding", ARRAY(sa.REAL)),
        sa.Column("embedding_model", sa.String(100), nullable=False),
        sa.UniqueConstraint("index_id", "position"),
    )
    op.create_table(
        "ai_conversations",
        *entity(),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("deleted", sa.Boolean, nullable=False),
        sa.Column("sequence", sa.Integer, nullable=False),
    )
    op.create_table(
        "ai_conversation_sources",
        sa.Column(
            "conversation_id",
            sa.String(36),
            sa.ForeignKey("ai_conversations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "index_id", sa.String(36), sa.ForeignKey("ai_document_indexes.id"), primary_key=True
        ),
    )
    op.create_table(
        "ai_jobs",
        *entity(),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("parent_id", sa.String(36), sa.ForeignKey("ai_jobs.id")),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("stage", sa.String(30), nullable=False),
        sa.Column("parameters", sa.JSON, nullable=False),
        sa.Column("result", sa.JSON),
        sa.Column("error", sa.JSON),
        sa.Column("attempts", sa.Integer, nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_token", sa.String(36)),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "ai_messages",
        *entity(),
        sa.Column(
            "conversation_id",
            sa.String(36),
            sa.ForeignKey("ai_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sequence", sa.Integer, nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("reply_to_id", sa.String(36), sa.ForeignKey("ai_messages.id")),
        sa.Column("generation_job_id", sa.String(36), sa.ForeignKey("ai_jobs.id"), unique=True),
        sa.Column("citations", sa.JSON, nullable=False),
        sa.Column("answer_status", sa.String(40)),
        sa.UniqueConstraint("conversation_id", "sequence"),
    )
    op.create_table(
        "ai_model_calls",
        *entity(),
        sa.Column(
            "job_id", sa.String(36), sa.ForeignKey("ai_jobs.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("operation", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("input_tokens", sa.Integer, nullable=False),
        sa.Column("output_tokens", sa.Integer, nullable=False),
    )
    op.create_table(
        "ai_idempotency",
        *entity(),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("operation", sa.String(100), nullable=False),
        sa.Column("request_key", sa.String(128), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("result", sa.JSON, nullable=False),
        sa.UniqueConstraint("owner_id", "operation", "request_key"),
    )
    for table, columns in {
        "ai_document_sources": ["owner_id", "document_id"],
        "ai_document_indexes": ["source_id"],
        "ai_document_chunks": ["index_id"],
        "ai_conversations": ["owner_id"],
        "ai_jobs": ["owner_id", "parent_id"],
        "ai_messages": ["conversation_id"],
        "ai_model_calls": ["job_id"],
        "ai_idempotency": ["owner_id"],
    }.items():
        for column in columns:
            op.create_index(f"ix_{table}_{column}", table, [column])
    op.create_index("ix_ai_jobs_queue", "ai_jobs", ["status", "available_at"])


def downgrade():
    for table in (
        "ai_idempotency",
        "ai_model_calls",
        "ai_messages",
        "ai_jobs",
        "ai_conversation_sources",
        "ai_conversations",
        "ai_document_chunks",
        "ai_document_indexes",
        "ai_document_sources",
    ):
        op.drop_table(table)
