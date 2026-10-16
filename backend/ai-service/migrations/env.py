from alembic import context

from app.core.config import Settings
from app.infrastructure.database import Database
from app.infrastructure.registry import Base

settings = Settings()
database = Database(settings.database_url.get_secret_value())
with database.engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()
database.engine.dispose()
