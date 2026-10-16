from uuid import UUID

from app.common.interceptors.response_interceptor import ApiRouter
from app.common.responses import ApiErrorResponse, ApiResponse
from app.core.dependencies import ActorDependency, RuntimeDependency
from app.modules.documents.constants import API_PREFIX
from app.modules.jobs.service import get_job

router = ApiRouter(
    prefix=API_PREFIX + "/jobs",
    tags=["AI jobs"],
    responses={"4XX": {"model": ApiErrorResponse}, 500: {"model": ApiErrorResponse}},
)


@router.get("/{job_id}", response_model=None, responses={200: {"model": ApiResponse[dict]}})
def get(job_id: UUID, actor: ActorDependency, runtime: RuntimeDependency):
    return get_job(runtime.database, runtime.client, actor, str(job_id))
