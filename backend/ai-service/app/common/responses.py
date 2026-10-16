from datetime import UTC, datetime

from pydantic import BaseModel, Field, JsonValue

from app.common.constants import ResponseMessage


def utc_timestamp() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class ApiResponse[T](BaseModel):
    success: bool
    message: str
    data: T | None
    errors: JsonValue = None
    timestamp: str = Field(default_factory=utc_timestamp)
    pagination: JsonValue = None
    code: str | None = None


class ApiErrorResponse(ApiResponse[None]):
    success: bool = False
    data: None = None


def success_payload(payload: JsonValue) -> dict[str, JsonValue]:
    # Match the Nest interceptor: an existing envelope is never wrapped twice.
    if isinstance(payload, dict) and "success" in payload and "timestamp" in payload:
        return payload

    message = str(ResponseMessage.SUCCESS)
    result = payload
    pagination = None
    if isinstance(payload, dict) and "message" in payload and "data" in payload:
        message = str(payload["message"])
        result = payload["data"]
        pagination = payload.get("pagination")

    envelope: dict[str, JsonValue] = {
        "success": True,
        "message": message,
        "data": result,
        "errors": None,
        "timestamp": utc_timestamp(),
    }
    if pagination is not None:
        envelope["pagination"] = pagination
    return envelope


def error_payload(
    message: str,
    *,
    errors: JsonValue = None,
    code: str | None = None,
) -> dict[str, JsonValue]:
    envelope: dict[str, JsonValue] = {
        "success": False,
        "message": message,
        "data": None,
        "errors": errors,
        "timestamp": utc_timestamp(),
    }
    if code is not None:
        envelope["code"] = code
    return envelope


def http_error_payload(detail: JsonValue, fallback: str) -> dict[str, JsonValue]:
    if isinstance(detail, dict):
        message = detail.get("message", fallback)
        code = detail.get("code")
        return error_payload(
            message if isinstance(message, str) else fallback,
            errors=detail.get("errors"),
            code=code if isinstance(code, str) else None,
        )
    return error_payload(detail if isinstance(detail, str) else fallback)
