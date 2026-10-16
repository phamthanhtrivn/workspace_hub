from sqlalchemy import select

from app.common.errors import ApiError, ErrorCode
from app.modules.conversations.repository import conversation_sources
from app.modules.documents.constants import JobKind, State
from app.modules.documents.models import DocumentSource
from app.modules.jobs.models import Job


def job_response(session, job):
    children = session.scalars(
        select(Job).where(Job.parent_id == job.id).order_by(Job.created_at, Job.id)
    ).all()
    if children:
        statuses = []
        documents = []
        for child in children:
            if "sourceId" not in child.parameters:
                raise ApiError(ErrorCode.NOT_FOUND, "Job artifacts have expired", 404)
            reference = (
                session.get(Job, child.parameters.get("referenceJobId"))
                if child.kind == "REFERENCE" and child.parameters.get("referenceJobId")
                else child
            )
            statuses.append(reference.status)
            documents.append(
                {
                    "jobId": child.id,
                    "sourceId": child.parameters["sourceId"],
                    "indexId": child.parameters["indexId"],
                    "status": reference.status,
                    "stage": reference.stage,
                    "error": reference.error,
                }
            )
        status = (
            "RUNNING"
            if any(value in (State.QUEUED, State.RUNNING, State.PENDING) for value in statuses)
            else "SUCCEEDED"
            if all(value == State.SUCCEEDED for value in statuses)
            else "FAILED"
            if all(value == State.FAILED for value in statuses)
            else "PARTIAL"
        )
        return {"id": job.id, "kind": job.kind, "status": status, "documents": documents}
    return {
        "id": job.id,
        "kind": job.kind,
        "status": job.status,
        "stage": job.stage,
        "error": job.error,
        "result": job.result,
    }


def get_job(database, client, actor, job_id):
    with database.sessions() as session:
        job = session.get(Job, job_id)
        if not job or job.owner_id != actor.id:
            raise ApiError(ErrorCode.NOT_FOUND, "Job not found", 404)
        sources = []
        if job.kind == JobKind.BATCH:
            children = session.scalars(select(Job).where(Job.parent_id == job.id)).all()
            if any("sourceId" not in child.parameters for child in children):
                raise ApiError(ErrorCode.NOT_FOUND, "Job artifacts have expired", 404)
            sources = [
                session.get(DocumentSource, child.parameters["sourceId"]) for child in children
            ]
        elif "sourceId" in job.parameters:
            sources = [session.get(DocumentSource, job.parameters["sourceId"])]
        elif "conversationId" in job.parameters:
            from app.modules.conversations.repository import owned_conversation

            owned_conversation(session, job.parameters["conversationId"], actor.id)
            sources = conversation_sources(session, job.parameters["conversationId"])
        if sources:
            client.access(actor, sources)
        return job_response(session, job)
