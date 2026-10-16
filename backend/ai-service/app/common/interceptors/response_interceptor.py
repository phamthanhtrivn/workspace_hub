import json
from collections.abc import Callable, Coroutine
from http import HTTPStatus
from typing import Any

from fastapi import APIRouter, Request, Response
from fastapi.routing import APIRoute

from app.common.responses import http_error_payload, success_payload


class ResponseInterceptorRoute(APIRoute):
    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        route_handler = super().get_route_handler()

        async def intercept(request: Request) -> Response:
            response = await route_handler(request)
            media_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
            if (
                request.method == "HEAD"
                or response.status_code in (HTTPStatus.NO_CONTENT, HTTPStatus.NOT_MODIFIED)
                or 300 <= response.status_code < 400
                or not (media_type == "application/json" or media_type.endswith("+json"))
                or not hasattr(response, "body")
            ):
                return response

            payload = json.loads(response.body)
            if response.status_code >= HTTPStatus.BAD_REQUEST:
                try:
                    fallback = HTTPStatus(response.status_code).phrase
                except ValueError:
                    fallback = "Request failed"
                envelope = http_error_payload(payload, fallback)
            else:
                envelope = success_payload(payload)

            response.body = json.dumps(
                envelope, ensure_ascii=False, allow_nan=False, separators=(",", ":")
            ).encode("utf-8")
            response.headers["content-length"] = str(len(response.body))
            return response

        return intercept


class ApiRouter(APIRouter):
    """Use for module routers so interception survives FastAPI's include_router."""

    def __init__(self, **kwargs: Any) -> None:
        kwargs.setdefault("route_class", ResponseInterceptorRoute)
        super().__init__(**kwargs)
