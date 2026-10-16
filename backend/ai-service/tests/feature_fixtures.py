import os
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool

from app.core.auth import Actor
from app.core.config import Settings
from app.infrastructure.database import Database
from app.infrastructure.registry import Base
from tests.feature_fakes import DocumentsFake, ProviderFake

TEST_SECRET = "test-only-signing-secret-with-32-characters"


@pytest.fixture
def feature_database():
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        from sqlalchemy import create_engine
        from sqlalchemy.schema import CreateSchema, DropSchema

        admin = create_engine(url)
        schema = "ai_test_" + uuid4().hex
        with admin.begin() as connection:
            connection.execute(CreateSchema(schema))
        database = Database(url, connect_args={"options": "-csearch_path=" + schema})
    else:
        database = Database(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    Base.metadata.create_all(database.engine)
    yield database
    database.engine.dispose()
    if url:
        with admin.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin.dispose()


@pytest.fixture
def feature_setup(feature_database, tmp_path):
    settings = Settings(
        _env_file=None,
        node_env="test",
        ai_enabled=True,
        database_url="sqlite://",
        jwt_secret_key=TEST_SECRET,
        internal_service_key=TEST_SECRET,
        document_service_url="http://documents.test",
        gemini_api_key="test-only-no-provider-calls",
    )
    documents = DocumentsFake(tmp_path)
    actor = Actor(str(uuid4()), "owner@example.test")
    first, second = str(uuid4()), str(uuid4())
    documents.add(first, "requirements.txt", "Thời hạn bàn giao là ngày 20/10/2026.".encode())
    documents.add(second, "minutes.md", b"# Meeting\n\nDelivery is 25/10/2026.", "text/markdown")
    ProviderFake.embeddings = ProviderFake.generations = 0
    return feature_database, settings, documents, actor, [first, second]
