from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from app.common.errors import ErrorCode, ProcessingError
from app.infrastructure.database import now
from app.infrastructure.idempotency import lock_key
from app.modules.usage.models import ModelCall


class UsageService:
    def __init__(self, database, settings):
        self.db, self.settings = database, settings

    def reserve(self, job_id, model, operation, input_tokens):
        with self.db.sessions.begin() as session:
            lock_key(session, "gemini-global-budget")
            cutoff = now() - timedelta(minutes=1)
            calls, tokens = session.execute(
                select(
                    func.count(ModelCall.id), func.coalesce(func.sum(ModelCall.input_tokens), 0)
                ).where(ModelCall.created_at >= cutoff)
            ).one()
            pacific = datetime.now(ZoneInfo("America/Los_Angeles"))
            midnight = pacific.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(UTC)
            daily = session.scalar(
                select(func.count(ModelCall.id)).where(ModelCall.created_at >= midnight)
            )
            if (
                calls >= self.settings.gemini_requests_per_minute
                or tokens + input_tokens > self.settings.gemini_tokens_per_minute
                or daily >= self.settings.gemini_requests_per_day
            ):
                raise ProcessingError(
                    ErrorCode.PROVIDER_QUOTA_EXCEEDED,
                    "Application Gemini budget exhausted",
                    retryable=True,
                )
            record = ModelCall(
                job_id=job_id, model=model, operation=operation, input_tokens=input_tokens
            )
            session.add(record)
            session.flush()
            return record.id

    def complete(self, call_id, status, usage=None):
        with self.db.sessions.begin() as session:
            record = session.get(ModelCall, call_id)
            record.status = status
            if usage:
                record.input_tokens = (
                    getattr(usage, "prompt_token_count", None) or record.input_tokens
                )
                record.output_tokens = getattr(usage, "candidates_token_count", None) or 0
