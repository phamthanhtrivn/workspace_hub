from http import HTTPStatus

from fastapi import HTTPException, Request
from pydantic import BaseModel

from app.common.constants import (
    HEALTH_PATH,
    READINESS_PATH,
    SERVICE_NAME,
    ResponseMessage,
)
from app.common.interceptors.response_interceptor import ApiRouter
from app.common.responses import ApiErrorResponse, ApiResponse

router = ApiRouter(tags=["Health"])


class HealthStatus(BaseModel):
    service: str = SERVICE_NAME
    status: str = "ok"


@router.get(
    HEALTH_PATH,
    response_model=None,
    responses={200: {"model": ApiResponse[HealthStatus]}},
)
async def health() -> dict[str, object]:
    return {"message": str(ResponseMessage.HEALTHY), "data": HealthStatus()}


@router.get(
    READINESS_PATH,
    response_model=None,
    responses={
        200: {"model": ApiResponse[HealthStatus]},
        503: {"model": ApiErrorResponse},
    },
)
async def ready(request: Request) -> dict[str, object]:
    runtime = getattr(request.app.state, "runtime", None)
    if not getattr(request.app.state, "ready", False) or (runtime and not runtime.database.ready()):
        raise HTTPException(
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            detail=str(ResponseMessage.NOT_READY),
        )
    return {"message": str(ResponseMessage.READY), "data": HealthStatus()}
