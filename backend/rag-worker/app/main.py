import hmac
import os
from functools import lru_cache
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .engine import Engine


def authorize(x_internal_service_key: Annotated[str, Header()] = ""):
    expected = os.environ.get("RAG_SERVICE_KEY", "").strip()
    previous = os.environ.get("RAG_SERVICE_KEY_PREVIOUS", "").strip()
    keys = [key for key in (expected, previous) if len(key) >= 32]
    if len(expected) < 32 or not any(hmac.compare_digest(x_internal_service_key.encode(), key.encode()) for key in keys):
        raise HTTPException(401, "Internal authentication required")


app = FastAPI(title="WorkSpaceHub RAG Worker", docs_url=None, redoc_url=None, openapi_url=None,
              dependencies=[Depends(authorize)])


@lru_cache
def engine():
    return Engine()


class Scope(BaseModel):
    scopeId: UUID
    sourceIds: list[UUID] = Field(min_length=1, max_length=5)


class Query(Scope):
    question: str = Field(min_length=1, max_length=4000)


class Index(BaseModel):
    scopeId: UUID
    sourceId: UUID
    revision: str = Field(pattern=r"^[a-f0-9]{64}$")
    name: str = Field(min_length=1, max_length=300)
    content: str = Field(max_length=28_000_000)


class Delete(BaseModel):
    scopeId: UUID
    sourceId: UUID | None = None


def execute(method, *args):
    try:
        return method(*args)
    except (ValueError, UnicodeError):
        raise HTTPException(422, "Invalid, scanned, encrypted or oversized source; see documented limits") from None
    except Exception:
        # Never send provider bodies, document contents or presigned URLs to callers/logs.
        raise HTTPException(503, "RAG dependency unavailable; verify model and vector database") from None


@app.get("/ready")
def ready():
    execute(engine().client.get_collections)
    return {"status": "ok", "embeddingLoaded": engine().model is not None, "collection": engine().collection}


@app.post("/index")
def index(data: Index):
    return execute(engine().index, str(data.scopeId), str(data.sourceId), data.revision, data.name, data.content)


@app.post("/retrieve")
def retrieve(data: Query):
    return execute(engine().retrieve, str(data.scopeId), list(map(str, data.sourceIds)), data.question)


@app.post("/chunks")
def chunks(data: Scope):
    return execute(engine().chunks, str(data.scopeId), list(map(str, data.sourceIds)))


@app.post("/delete")
def delete(data: Delete):
    return execute(engine().delete, str(data.scopeId), str(data.sourceId) if data.sourceId else None)
