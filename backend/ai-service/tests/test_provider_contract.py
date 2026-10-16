import pytest

from app.common.errors import ProcessingError
from app.infrastructure.gemini import GeminiProvider
from app.modules.jobs.models import Job
from app.modules.usage.service import UsageService


def test_sdk_configuration_requires_no_provider_request(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    provider = GeminiProvider(database, settings, "not-used", lambda: None)
    provider.close()


def test_usage_admission_counts_failed_requests_and_enforces_budget(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    settings.gemini_requests_per_minute = 1
    with database.sessions.begin() as session:
        job = Job(owner_id=actor.id, kind="ANSWER")
        session.add(job)
        session.flush()
        job_id = job.id
    usage = UsageService(database, settings)
    call = usage.reserve(job_id, "test", "GENERATE", 10)
    usage.complete(call, "FAILED")
    with pytest.raises(ProcessingError) as failure:
        usage.reserve(job_id, "test", "GENERATE", 10)
    assert failure.value.code == "PROVIDER_QUOTA_EXCEEDED"
