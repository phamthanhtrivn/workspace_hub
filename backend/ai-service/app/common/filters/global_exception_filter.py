import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import JsonValue
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.common.constants import ResponseMessage
from app.common.responses import error_payload, http_error_payload

logger = logging.getLogger("ai_service.errors")
LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})


async def http_exception_handler(request: Request, exception: HTTPException) -> JSONResponse:
    try:
        fallback = HTTPStatus(exception.status_code).phrase
    except ValueError:
        fallback = "Request failed"
    return JSONResponse(
        status_code=exception.status_code,
        content=http_error_payload(exception.detail, fallback),
        headers=exception.headers,
    )


async def validation_exception_handler(
    request: Request, exception: RequestValidationError
) -> JSONResponse:
    field_errors: dict[str, JsonValue] = {}
    for error in exception.errors():
        location = list(error["loc"])
        prefix = str(location.pop(0)) if location and location[0] in LOCATION_PREFIXES else "body"
        if error["type"] == "json_invalid":
            field_errors.setdefault("body", str(ResponseMessage.INVALID_JSON))
            continue
        keys = [str(part) for part in location] or [prefix]
        nested = field_errors
        for key in keys[:-1]:
            child = nested.get(key)
            if not isinstance(child, dict):
                child = {}
                nested[key] = child
            nested = child
        nested.setdefault(keys[-1], error["msg"])

    return JSONResponse(
        status_code=HTTPStatus.BAD_REQUEST,
        content=error_payload(str(ResponseMessage.VALIDATION_FAILED), errors=field_errors),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)


class GlobalExceptionFilter:
    """Catch unexpected errors before sending headers; never replace a started stream."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def track_start(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, track_start)
        except Exception:
            logger.exception("Unhandled request error")
            if response_started:
                raise
            response = JSONResponse(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                content=error_payload(str(ResponseMessage.INTERNAL_SERVER_ERROR)),
            )
            await response(scope, receive, send)
