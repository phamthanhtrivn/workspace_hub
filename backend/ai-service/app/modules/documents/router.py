from uuid import UUID

from fastapi import Query

from app.common.interceptors.response_interceptor import ApiRouter
from app.common.responses import ApiErrorResponse, ApiResponse
from app.core.dependencies import ActorDependency, IdempotencyKey, RuntimeDependency
from app.modules.documents.constants import API_PREFIX
from app.modules.documents.schemas import RegisterDocuments, ValidateDocuments
from app.modules.documents.validation import validate_metadata

router = ApiRouter(
    prefix=API_PREFIX + "/documents",
    tags=["AI documents"],
    responses={"4XX": {"model": ApiErrorResponse}, 500: {"model": ApiErrorResponse}},
)


@router.post("/validate", response_model=None, responses={200: {"model": ApiResponse[dict]}})
def validate(request: ValidateDocuments, actor: ActorDependency):
    return validate_metadata(request.documents)


@router.post(
    "", status_code=202, response_model=None, responses={202: {"model": ApiResponse[dict]}}
)
def register(
    request: RegisterDocuments,
    actor: ActorDependency,
    key: IdempotencyKey,
    runtime: RuntimeDependency,
):
    return runtime.documents.register(actor, request, key)


@router.get("", response_model=None, responses={200: {"model": ApiResponse[dict]}})
def list_documents(
    actor: ActorDependency,
    runtime: RuntimeDependency,
    after: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=50),
):
    return runtime.documents.list(actor, str(after) if after else None, limit)


@router.get("/{source_id}", response_model=None, responses={200: {"model": ApiResponse[dict]}})
def get_document(source_id: UUID, actor: ActorDependency, runtime: RuntimeDependency):
    return runtime.documents.get(actor, str(source_id))
