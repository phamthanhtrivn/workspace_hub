from datetime import datetime
from uuid import UUID

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse, Response, StreamingResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.background import BackgroundTask

from app.common.interceptors.response_interceptor import ApiRouter
from app.common.responses import success_payload

ENVELOPE_FIELDS = {"success", "message", "data", "errors", "timestamp"}


def test_health_uses_nest_envelope(client: TestClient) -> None:
    response = client.get("/health")
    payload = response.json()
    assert response.status_code == 200
    assert set(payload) == ENVELOPE_FIELDS
    assert payload["success"] is True
    assert payload["data"] == {"service": "ai-service", "status": "ok"}
    assert payload["errors"] is None
    assert datetime.fromisoformat(payload["timestamp"]).utcoffset().total_seconds() == 0
    assert response.headers["content-length"] == str(len(response.content))


def test_included_router_wraps_payload_and_keeps_metadata(application: FastAPI) -> None:
    router = ApiRouter()
    completed: list[bool] = []

    @router.get("/contract")
    async def contract() -> JSONResponse:
        response = JSONResponse(
            status_code=201,
            content={
                "message": "Created",
                "data": {"title": "Tiếng Việt"},
                "pagination": {"nextCursor": "next"},
            },
            headers={"X-Custom": "preserved"},
            background=BackgroundTask(completed.append, True),
        )
        response.set_cookie("session", "test", httponly=True)
        return response

    application.include_router(router)
    with TestClient(application) as client:
        response = client.get("/contract")
    assert response.status_code == 201
    assert response.json()["data"] == {"title": "Tiếng Việt"}
    assert response.json()["pagination"] == {"nextCursor": "next"}
    assert response.json()["message"] == "Created"
    assert response.headers["x-custom"] == "preserved"
    assert response.cookies["session"] == "test"
    assert response.headers["content-length"] == str(len(response.content))
    assert completed == [True]


def test_existing_envelope_is_not_wrapped_twice(application: FastAPI) -> None:
    expected = success_payload({"title": "existing"})

    @application.get("/wrapped")
    async def wrapped() -> dict:
        return expected

    with TestClient(application) as client:
        assert client.get("/wrapped").json() == expected


@pytest.mark.parametrize("payload", [None, [1, 2], "hello", 0, False])
def test_scalar_list_and_null_responses_are_wrapped(application: FastAPI, payload: object) -> None:
    @application.get("/value", response_model=None)
    async def value() -> object:
        return payload

    with TestClient(application) as client:
        assert client.get("/value").json()["data"] == payload


@pytest.mark.parametrize("status", [400, 401, 403, 404, 409, 429, 503])
def test_http_errors_share_contract_and_preserve_status(application: FastAPI, status: int) -> None:
    @application.get("/error")
    async def error() -> None:
        raise HTTPException(
            status_code=status,
            detail={"message": "Operation unavailable", "code": "TEST_ERROR"},
            headers={"Retry-After": "5"},
        )

    with TestClient(application) as client:
        response = client.get("/error")
    assert response.status_code == status
    assert response.json()["success"] is False
    assert response.json()["message"] == "Operation unavailable"
    assert response.json()["code"] == "TEST_ERROR"
    assert response.json()["data"] is None
    assert response.json()["errors"] is None
    assert response.headers["retry-after"] == "5"


def test_explicit_error_response_is_normalized(application: FastAPI) -> None:
    @application.get("/explicit-error")
    async def explicit_error() -> JSONResponse:
        return JSONResponse(status_code=409, content={"message": "Conflict", "code": "CONFLICT"})

    with TestClient(application) as client:
        response = client.get("/explicit-error")
    assert response.status_code == 409
    assert response.json()["success"] is False
    assert response.json()["code"] == "CONFLICT"


@pytest.mark.parametrize("method,path,status", [("GET", "/missing", 404), ("POST", "/health", 405)])
def test_framework_errors_use_same_contract(
    client: TestClient, method: str, path: str, status: int
) -> None:
    response = client.request(method, path)
    assert response.status_code == status
    assert set(response.json()) == ENVELOPE_FIELDS
    assert response.json()["success"] is False
    if status == 405:
        assert response.headers["allow"] == "GET"


class NestedInput(BaseModel):
    title: str = Field(min_length=1)


class ContractInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nested: NestedInput
    count: int = Field(gt=0)


def test_validation_returns_400_and_nested_field_errors(application: FastAPI) -> None:
    @application.post("/validate")
    async def validate(payload: ContractInput) -> ContractInput:
        return payload

    with TestClient(application) as client:
        response = client.post(
            "/validate", json={"nested": {"title": ""}, "count": 0, "unexpected": "private"}
        )
    assert response.status_code == 400
    assert response.json()["message"] == "Validation failed"
    assert isinstance(response.json()["errors"]["nested"]["title"], str)
    assert isinstance(response.json()["errors"]["count"], str)
    assert isinstance(response.json()["errors"]["unexpected"], str)
    assert "private" not in response.text


def test_invalid_json_uses_validation_contract(application: FastAPI) -> None:
    @application.post("/validate")
    async def validate(payload: ContractInput) -> ContractInput:
        return payload

    with TestClient(application) as client:
        response = client.post(
            "/validate", content='{"private":', headers={"Content-Type": "application/json"}
        )
    assert response.status_code == 400
    assert response.json()["errors"] == {"body": "Invalid JSON body"}
    assert "private" not in response.text


def test_unexpected_error_is_sanitized_with_cors_and_request_id(application: FastAPI) -> None:
    @application.get("/crash")
    async def crash() -> None:
        raise RuntimeError("private provider credentials")

    with TestClient(application) as client:
        response = client.get(
            "/crash",
            headers={"Origin": "http://localhost:3000", "X-Request-ID": "request-123"},
        )
    assert response.status_code == 500
    assert response.json()["message"] == "Internal server error"
    assert set(response.json()) == ENVELOPE_FIELDS
    assert "private" not in response.text
    assert response.headers["x-request-id"] == "request-123"
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "X-Request-ID" in response.headers["access-control-expose-headers"]


def test_invalid_response_model_is_internal_error(application: FastAPI) -> None:
    @application.get("/invalid-response", response_model=NestedInput)
    async def invalid_response() -> dict:
        return {"wrong": "private"}

    with TestClient(application) as client:
        response = client.get("/invalid-response")
    assert response.status_code == 500
    assert response.json()["message"] == "Internal server error"
    assert "private" not in response.text


def test_empty_non_json_and_stream_responses_are_preserved(application: FastAPI) -> None:
    @application.delete("/empty", status_code=204)
    async def empty() -> Response:
        return Response(status_code=204)

    @application.get("/plain")
    async def plain() -> PlainTextResponse:
        return PlainTextResponse("unchanged")

    @application.get("/stream")
    async def stream() -> StreamingResponse:
        return StreamingResponse(
            iter(["data: first\n\n", "data: second\n\n"]), media_type="text/event-stream"
        )

    with TestClient(application) as client:
        assert client.delete("/empty").content == b""
        assert client.get("/plain").text == "unchanged"
        assert client.get("/stream").text == "data: first\n\ndata: second\n\n"


@pytest.mark.parametrize("request_id", ["", "invalid request id", "x" * 129])
def test_request_id_is_generated_when_missing_or_invalid(
    client: TestClient, request_id: str
) -> None:
    response = client.get("/health", headers={"X-Request-ID": request_id})
    assert str(UUID(response.headers["x-request-id"])) == response.headers["x-request-id"]


def test_no_ai_feature_endpoints_are_registered(application: FastAPI) -> None:
    assert set(application.openapi()["paths"]) == {"/health", "/ready"}


def test_openapi_documents_health_envelope(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    response_schema = schema["paths"]["/health"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    envelope = schema["components"]["schemas"][response_schema["$ref"].split("/")[-1]]
    assert ENVELOPE_FIELDS <= set(envelope["properties"])
