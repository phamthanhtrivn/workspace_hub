import logging
import re
from contextvars import ContextVar
from time import perf_counter
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.common.constants import MAX_REQUEST_ID_LENGTH, REQUEST_ID_HEADER

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")
logger = logging.getLogger("ai_service.requests")
REQUEST_ID_PATTERN = re.compile(rf"[A-Za-z0-9][A-Za-z0-9._:-]{{0,{MAX_REQUEST_ID_LENGTH - 1}}}")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        supplied_id = Headers(scope=scope).get(REQUEST_ID_HEADER, "")
        request_id = supplied_id if REQUEST_ID_PATTERN.fullmatch(supplied_id) else str(uuid4())
        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_context.set(request_id)
        started_at = perf_counter()
        status_code = 500

        async def attach_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, attach_request_id)
        finally:
            logger.info(
                "%s %s status=%d duration_ms=%.2f",
                scope["method"],
                scope["path"],
                status_code,
                (perf_counter() - started_at) * 1000,
            )
            request_id_context.reset(token)
