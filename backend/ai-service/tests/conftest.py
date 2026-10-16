from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytest_plugins = ["tests.feature_fixtures"]


@pytest.fixture
def application() -> FastAPI:
    return create_app(
        Settings(
            _env_file=None,
            node_env="test",
            ai_enabled=False,
            cors_allowed_origins=["http://localhost:3000"],
        )
    )


@pytest.fixture
def client(application: FastAPI) -> Iterator[TestClient]:
    with TestClient(application) as test_client:
        yield test_client
