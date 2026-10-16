from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.common.constants import REQUEST_ID_HEADER, SERVICE_VERSION
from app.common.filters.global_exception_filter import (
    GlobalExceptionFilter,
    register_exception_handlers,
)
from app.common.interceptors.response_interceptor import ResponseInterceptorRoute
from app.common.middleware.request_context import RequestContextMiddleware
from app.core.config import Settings
from app.core.logging import configure_logging
from app.core.runtime import install_features
from app.modules.health.router import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.ready = True
    try:
        yield
    finally:
        app.state.ready = False
        if hasattr(app.state, "runtime"):
            app.state.runtime.close()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else Settings()
    configure_logging(settings.log_level)
    expose_docs = settings.node_env != "production"
    app = FastAPI(
        title="WorkSpaceHub AI Service",
        version=SERVICE_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if expose_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if expose_docs else None,
        debug=False,
    )
    app.state.settings = settings
    app.state.ready = False
    app.router.route_class = ResponseInterceptorRoute
    register_exception_handlers(app)
    app.include_router(health_router)
    if settings.ai_enabled:
        install_features(app, settings)

    # Last added is outermost: all errors also receive CORS and request ID headers.
    app.add_middleware(GlobalExceptionFilter)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
    )
    app.add_middleware(RequestContextMiddleware)
    return app


if __name__ == "__main__":
    config = Settings()
    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host=config.host,
        port=config.port,
        reload=config.node_env == "development",
        log_level=config.log_level.lower(),
        access_log=False,
    )
