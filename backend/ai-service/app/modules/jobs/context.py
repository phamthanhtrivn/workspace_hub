from app.common.errors import ErrorCode, ProcessingError
from app.infrastructure.database import now
from app.modules.documents.constants import State
from app.modules.jobs.models import Job


class JobContext:
    def __init__(self, database, job_id, token):
        self.db, self.job_id, self.token = database, job_id, token

    def guard(self, session):
        job = session.get(Job, self.job_id, with_for_update=True)
        if (
            not job
            or job.status != State.RUNNING
            or job.lease_token != self.token
            or not job.lease_until
            or job.lease_until.replace(tzinfo=now().tzinfo) <= now()
        ):
            raise ProcessingError(
                ErrorCode.JOB_INTERRUPTED, "Job was cancelled or its lease expired"
            )
        return job

    def check(self):
        with self.db.sessions.begin() as session:
            self.guard(session)

    def stage(self, stage):
        with self.db.sessions.begin() as session:
            self.guard(session).stage = stage
