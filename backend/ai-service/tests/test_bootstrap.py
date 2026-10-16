import json
import os
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError
from urllib.request import urlopen

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app


def test_readiness_tracks_lifespan(application: FastAPI) -> None:
    assert application.state.ready is False
    with TestClient(application) as client:
        assert client.get("/ready").status_code == 200
        application.state.ready = False
        response = client.get("/ready")
        assert response.status_code == 503
        assert response.json()["success"] is False
        assert client.get("/health").status_code == 200
    assert application.state.ready is False


def test_production_disables_docs_and_keeps_error_contract() -> None:
    app = create_app(Settings(_env_file=None, node_env="production", ai_enabled=False))
    with TestClient(app) as client:
        for path in ("/docs", "/openapi.json"):
            response = client.get(path)
            assert response.status_code == 404
            assert response.json()["success"] is False
        assert client.get("/ready").status_code == 200


def test_settings_parse_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PORT", "8090")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000, https://workspace.example ")
    settings = Settings(_env_file=None)
    assert settings.port == 8090
    assert settings.cors_allowed_origins == ["http://localhost:3000", "https://workspace.example"]


@pytest.mark.parametrize("port", [0, 65536])
def test_settings_reject_invalid_port(port: int) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, port=port)


def test_settings_reject_credentialed_wildcard_cors() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, cors_allowed_origins="*")


def test_production_entrypoint_starts_and_serves_readiness() -> None:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    environment = dict(
        os.environ,
        NODE_ENV="production",
        HOST="127.0.0.1",
        PORT=str(port),
        CORS_ALLOWED_ORIGINS="",
        AI_ENABLED="false",
    )
    process = subprocess.Popen(
        [sys.executable, "-m", "app.main"],
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    try:
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if process.poll() is not None:
                pytest.fail(f"Service exited during startup: {process.communicate()[0].decode()}")
            try:
                with urlopen(f"http://127.0.0.1:{port}/ready", timeout=1) as response:
                    payload = json.load(response)
                assert payload["success"] is True
                assert payload["data"]["service"] == "ai-service"
                break
            except OSError:
                time.sleep(0.1)
        else:
            pytest.fail("Service readiness timed out")

        with pytest.raises(HTTPError) as error:
            urlopen(f"http://127.0.0.1:{port}/openapi.json", timeout=1)
        assert error.value.code == 404
        assert json.load(error.value)["success"] is False
    finally:
        process.terminate()
        process.communicate(timeout=5)
