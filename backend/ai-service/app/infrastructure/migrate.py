"""Bootstrap only ai_db, then apply committed Alembic revisions."""

import psycopg
from alembic import command
from alembic.config import Config
from psycopg import sql
from sqlalchemy.engine import make_url

from app.core.config import SERVICE_ROOT, Settings


def migrate():
    settings = Settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required for AI migrations")
    url = make_url(settings.database_url.get_secret_value())
    if url.database != "ai_db":
        raise RuntimeError("The AI migrator only manages ai_db")
    connection = dict(
        host=url.host,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        dbname="postgres",
        connect_timeout=10,
    )
    with psycopg.connect(**connection, autocommit=True) as database:
        database.execute("SELECT pg_advisory_lock(78351047)")
        if not database.execute("SELECT 1 FROM pg_database WHERE datname = 'ai_db'").fetchone():
            database.execute(sql.SQL("CREATE DATABASE {} ").format(sql.Identifier("ai_db")))
    configuration = Config(str(SERVICE_ROOT / "alembic.ini"))
    command.upgrade(configuration, "head")


if __name__ == "__main__":
    migrate()
