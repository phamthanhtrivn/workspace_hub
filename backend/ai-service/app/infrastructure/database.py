from datetime import UTC, datetime
from uuid import uuid4

from fastapi import Request
from sqlalchemy import JSON, DateTime, String, UniqueConstraint, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def now() -> datetime:
    return datetime.now(UTC)


def identifier() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Entity:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Idempotency(Base, Entity):
    __tablename__ = "ai_idempotency"
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    operation: Mapped[str] = mapped_column(String(100))
    request_key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    result: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("owner_id", "operation", "request_key"),)


class Database:
    def __init__(self, url: str, **kwargs) -> None:
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        self.engine = create_engine(url, pool_pre_ping=True, hide_parameters=True, **kwargs)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def ready(self) -> bool:
        try:
            from alembic.config import Config
            from alembic.script import ScriptDirectory

            from app.core.config import SERVICE_ROOT

            expected = ScriptDirectory.from_config(
                Config(str(SERVICE_ROOT / "alembic.ini"))
            ).get_current_head()
            with self.engine.connect() as connection:
                return (
                    connection.scalar(text("SELECT version_num FROM alembic_version")) == expected
                )
        except Exception:
            return False


def database(request: Request) -> Database:
    return request.app.state.database
