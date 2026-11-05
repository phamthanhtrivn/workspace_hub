import hmac
import logging
import os
import threading
from functools import lru_cache
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .engine import Engine
from .errors import InvalidSource, ValidationBusy

logger = logging.getLogger("workspace.rag")


def authorize(x_internal_service_key: Annotated[str, Header()] = ""):
    expected = os.environ.get("RAG_SERVICE_KEY", "").strip()
    previous = os.environ.get("RAG_SERVICE_KEY_PREVIOUS", "").strip()
    keys = [key for key in (expected, previous) if len(key) >= 32]
    if len(expected) < 32 or not any(hmac.compare_digest(x_internal_service_key.encode(), key.encode()) for key in keys):
        raise HTTPException(401, "Internal authentication required")


app = FastAPI(title="WorkSpaceHub RAG Worker", docs_url=None, redoc_url=None, openapi_url=None,
              dependencies=[Depends(authorize)])


_engine_lock = threading.Lock()


@lru_cache
def cached_engine():
    return Engine()


def engine():
    # Concurrent initial health/index requests must not load duplicate models.
    with _engine_lock:
        return cached_engine()


class Scope(BaseModel):
    scopeId: UUID
    sourceIds: list[UUID] = Field(min_length=1, max_length=5)


class Query(Scope):
    question: str = Field(min_length=1, max_length=4000)


class UploadCheck(BaseModel):
    scopeId: UUID
    name: str = Field(min_length=1, max_length=300)
    content: str = Field(max_length=28_000_000)


class VisualText(BaseModel):
    text: str = Field(max_length=500_000)
    page: int | None = Field(default=None, ge=1, le=100)
    imageId: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")


class Index(UploadCheck):
    sourceId: UUID
    revision: str = Field(pattern=r"^[a-f0-9]{64}$")
    pages: list[VisualText] | None = Field(default=None, max_length=100)
    visuals: list[VisualText] = Field(default_factory=list, max_length=24)


class Delete(BaseModel):
    scopeId: UUID
    sourceId: UUID | None = None


def execute(method, *args):
    try:
        return method(*args)
    except InvalidSource as error:
        raise HTTPException(422, {"code": error.code}) from None
    except ValidationBusy:
        raise HTTPException(503, {"code": "RAG_BUSY"}) from None
    except MemoryError:
        logger.error("RAG operation=%s error=MemoryError", getattr(method, "__name__", "unknown"))
        raise HTTPException(503, {"code": "RAG_MEMORY_PRESSURE"}) from None
    except Exception as error:
        # Never send provider bodies, document contents or presigned URLs to callers/logs.
        logger.error("RAG operation=%s error=%s", getattr(method, "__name__", "unknown"), type(error).__name__)
        raise HTTPException(503, {"code": "RAG_DEPENDENCY_FAILED"}) from None


@app.get("/ready")
def ready():
    execute(engine().ready)
    return {"status": "ok", "embeddingLoaded": engine().model is not None, "collection": engine().collection}


@app.post("/index")
def index(data: Index):
    return execute(engine().index, str(data.scopeId), str(data.sourceId), data.revision, data.name, data.content,
                   [item.model_dump() for item in data.pages] if data.pages is not None else None,
                   [item.model_dump() for item in data.visuals])


@app.post("/extract")
def extract(data: UploadCheck):
    return execute(engine().extract, data.name, data.content)


@app.post("/validate")
def validate(data: UploadCheck):
    return execute(engine().validate, data.name, data.content, str(data.scopeId))


@app.post("/retrieve")
def retrieve(data: Query):
    return execute(engine().retrieve, str(data.scopeId), list(map(str, data.sourceIds)), data.question)


@app.post("/chunks")
def chunks(data: Scope):
    return execute(engine().chunks, str(data.scopeId), list(map(str, data.sourceIds)))


@app.post("/delete")
def delete(data: Delete):
    return execute(engine().delete, str(data.scopeId), str(data.sourceId) if data.sourceId else None)
