from uuid import UUID

from fastapi import Query

from app.common.interceptors.response_interceptor import ApiRouter
from app.common.responses import ApiErrorResponse, ApiResponse
from app.core.dependencies import ActorDependency, IdempotencyKey, RuntimeDependency
from app.modules.conversations.schemas import CreateConversation, CreateMessage
from app.modules.documents.constants import API_PREFIX

router = ApiRouter(
    prefix=API_PREFIX + "/conversations",
    tags=["AI conversations"],
    responses={"4XX": {"model": ApiErrorResponse}, 500: {"model": ApiErrorResponse}},
)


@router.post(
    "", status_code=201, response_model=None, responses={201: {"model": ApiResponse[dict]}}
)
def create(
    request: CreateConversation,
    actor: ActorDependency,
    key: IdempotencyKey,
    runtime: RuntimeDependency,
):
    return runtime.conversations.create(actor, request, key)


@router.get("", response_model=None, responses={200: {"model": ApiResponse[dict]}})
def list_conversations(
    actor: ActorDependency,
    runtime: RuntimeDependency,
    after: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=50),
):
    return runtime.conversations.list(actor, str(after) if after else None, limit)


@router.get(
    "/{conversation_id}", response_model=None, responses={200: {"model": ApiResponse[dict]}}
)
def get(conversation_id: UUID, actor: ActorDependency, runtime: RuntimeDependency):
    return runtime.conversations.get(actor, str(conversation_id))


@router.post(
    "/{conversation_id}/messages",
    status_code=202,
    response_model=None,
    responses={202: {"model": ApiResponse[dict]}},
)
def send(
    conversation_id: UUID,
    request: CreateMessage,
    actor: ActorDependency,
    key: IdempotencyKey,
    runtime: RuntimeDependency,
):
    return runtime.conversations.send(actor, str(conversation_id), request, key)


@router.get(
    "/{conversation_id}/messages",
    response_model=None,
    responses={200: {"model": ApiResponse[dict]}},
)
def history(
    conversation_id: UUID,
    actor: ActorDependency,
    runtime: RuntimeDependency,
    after: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
):
    return runtime.conversations.messages(actor, str(conversation_id), after, limit)


@router.delete(
    "/{conversation_id}", response_model=None, responses={200: {"model": ApiResponse[dict]}}
)
def remove(conversation_id: UUID, actor: ActorDependency, runtime: RuntimeDependency):
    return runtime.conversations.remove(actor, str(conversation_id))
