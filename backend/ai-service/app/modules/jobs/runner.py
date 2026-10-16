from datetime import timedelta

from sqlalchemy import select

from app.common.errors import ApiError, ErrorCode, ProcessingError
from app.infrastructure.database import identifier, now
from app.infrastructure.gemini import GeminiProvider
from app.modules.conversations.answering import answer_question
from app.modules.conversations.models import Message
from app.modules.documents.constants import JobKind, State
from app.modules.documents.models import DocumentIndex
from app.modules.ingestion.service import ingest
from app.modules.jobs.context import JobContext
from app.modules.jobs.models import Job
from app.modules.usage.models import ModelCall


def recover(database):
    with database.sessions.begin() as session:
        expired = session.scalars(
            select(Job)
            .where(Job.status == State.RUNNING, Job.lease_until < now())
            .with_for_update(skip_locked=True)
        ).all()
        for job in expired:
            reply = session.scalar(select(Message).where(Message.generation_job_id == job.id))
            index = (
                session.get(DocumentIndex, job.parameters["indexId"])
                if "indexId" in job.parameters
                else None
            )
            if (reply and reply.status == State.COMPLETED) or (
                index and index.status == State.READY
            ):
                job.status, job.stage = State.SUCCEEDED, "COMPLETED"
                job.result = (
                    {"assistantMessageId": reply.id}
                    if reply
                    else {"sourceId": index.source_id, "indexId": index.id}
                )
                job.lease_token, job.lease_until = None, None
                continue
            uncertain = session.scalar(
                select(ModelCall.id).where(
                    ModelCall.job_id == job.id, ModelCall.status.in_(("STARTED", "UNKNOWN"))
                )
            )
            if job.kind == JobKind.ANSWER or uncertain:
                job.status = State.FAILED
                job.error = ProcessingError(
                    ErrorCode.JOB_INTERRUPTED, "Job interrupted; submit a new request to retry"
                ).payload()
                if "indexId" in job.parameters:
                    index = session.get(DocumentIndex, job.parameters["indexId"])
                    index.status, index.error = State.FAILED, job.error
                if reply:
                    reply.status = State.FAILED
            else:
                job.status = State.QUEUED
            job.lease_token, job.lease_until = None, None


def claim(database, settings):
    with database.sessions.begin() as session:
        job = session.scalar(
            select(Job)
            .where(
                Job.status == State.QUEUED,
                Job.available_at <= now(),
                Job.kind.in_((JobKind.INGEST, JobKind.ANSWER)),
            )
            .order_by(Job.created_at, Job.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not job:
            return None
        job.status, job.lease_token = State.RUNNING, identifier()
        job.lease_until = now() + timedelta(seconds=settings.job_lease_seconds)
        job.attempts += 1
        return job.id, job.lease_token


def execute(database, client, settings, job_id, token, provider_factory=GeminiProvider):
    context = JobContext(database, job_id, token)
    provider = provider_factory(database, settings, job_id, context.check)
    kind, parameters = None, {}
    try:
        with database.sessions() as session:
            job = context.guard(session)
            kind, parameters = job.kind, job.parameters
        result = (
            ingest(context, client, provider, settings, parameters)
            if kind == JobKind.INGEST
            else answer_question(context, client, provider, parameters)
        )
        with database.sessions.begin() as session:
            job = context.guard(session)
            job.status, job.stage, job.result = State.SUCCEEDED, "COMPLETED", result
            job.lease_until = None
    except Exception as error:
        if isinstance(error, ApiError):
            failure = ProcessingError(
                ErrorCode.SOURCE_UNAVAILABLE, "Source access is no longer available"
            )
        elif isinstance(error, ProcessingError):
            failure = error
        else:
            failure = ProcessingError(
                ErrorCode.INVALID_FILE_CONTENT, "Processing failed unexpectedly"
            )
        with database.sessions.begin() as session:
            job = session.get(Job, job_id, with_for_update=True)
            if job.status != State.RUNNING or job.lease_token != token:
                return
            # Only explicit provider quota failures can automatically defer ingestion.
            if (
                kind == JobKind.INGEST
                and failure.retryable
                and job.created_at.replace(tzinfo=now().tzinfo) > now() - timedelta(days=1)
                and failure.code == ErrorCode.PROVIDER_QUOTA_EXCEEDED
            ):
                job.status = State.QUEUED
                job.stage = "WAITING_QUOTA"
                job.available_at = now() + timedelta(seconds=60)
            else:
                job.status = State.FAILED
            job.error, job.lease_until = failure.payload(), None
            if "indexId" in parameters:
                index = session.get(DocumentIndex, parameters["indexId"])
                index.status = State.PENDING if job.status == State.QUEUED else State.FAILED
                index.error = job.error
            reply = session.scalar(select(Message).where(Message.generation_job_id == job_id))
            if reply:
                reply.status = State.FAILED
    finally:
        provider.close()
