from datetime import timedelta

import pytest

from app.common.errors import ProcessingError
from app.infrastructure.database import now
from app.modules.conversations.answering import validate_answer
from app.modules.conversations.schemas import ModelAnswer
from app.modules.jobs.models import Job
from app.modules.jobs.runner import claim, recover
from app.modules.usage.models import ModelCall
from tests.feature_fakes import ProviderFake
from tests.test_documents_qa import register


def test_expired_ingestion_lease_recovers_without_reprocessing_ready_documents(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    register(feature_setup)
    job_id, token = claim(database, settings)
    with database.sessions.begin() as session:
        session.get(Job, job_id).lease_until = now() - timedelta(seconds=10)
    recover(database)
    claimed = claim(database, settings)
    assert claimed[0] == job_id and claimed[1] != token


def test_uncertain_provider_call_does_not_automatically_repeat(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    register(feature_setup)
    job_id, token = claim(database, settings)
    with database.sessions.begin() as session:
        session.get(Job, job_id).lease_until = now() - timedelta(seconds=10)
        session.add(ModelCall(job_id=job_id, model="test", operation="EMBED", status="STARTED"))
    recover(database)
    with database.sessions() as session:
        assert session.get(Job, job_id).status == "FAILED"


def test_model_cannot_cite_unretrieved_evidence():
    answer = ModelAnswer(
        answer_status="ANSWERED",
        claims=[{"text": "Unsupported claim", "citation_ids": ["invented"]}],
    )
    with pytest.raises(ProcessingError) as failure:
        validate_answer(answer, [], {})
    assert failure.value.code == "INVALID_MODEL_OUTPUT"


def test_quota_deferral_resumes_embedding_without_reparsing(feature_setup, monkeypatch):
    from app.common.errors import ErrorCode
    from app.modules.documents.models import DocumentIndex
    from app.modules.jobs.runner import execute

    database, settings, documents, actor, ids = feature_setup
    registered = register(feature_setup)

    class QuotaProvider(ProviderFake):
        def embed(self, content, **kwargs):
            raise ProcessingError(
                ErrorCode.PROVIDER_QUOTA_EXCEEDED, "Test quota exhausted", retryable=True
            )

    claimed = claim(database, settings)
    execute(database, documents, settings, *claimed, provider_factory=QuotaProvider)
    with database.sessions.begin() as session:
        job = session.get(Job, claimed[0])
        assert job.status == "QUEUED" and job.stage == "WAITING_QUOTA"
        job.available_at = now() - timedelta(seconds=1)
        assert session.get(DocumentIndex, registered["documents"][0]["indexId"]).content_hash
    monkeypatch.setattr(
        "app.modules.ingestion.service.convert_isolated",
        lambda *args: pytest.fail("Parser repeated after checkpoint"),
    )
    claimed = claim(database, settings)
    execute(database, documents, settings, *claimed, provider_factory=ProviderFake)
    with database.sessions() as session:
        assert session.get(Job, claimed[0]).status == "SUCCEEDED"


def test_model_cannot_publish_uncited_facts():
    answer = ModelAnswer(
        answer_status="ANSWERED", claims=[{"text": "Unsupported claim", "citation_ids": []}]
    )
    with pytest.raises(ProcessingError):
        validate_answer(answer, [], {})


def test_missing_evidence_is_allowed_without_invented_citations():
    answer = ModelAnswer(
        answer_status="INSUFFICIENT_EVIDENCE",
        claims=[{"text": "The supplied files do not establish a deadline.", "citation_ids": []}],
    )
    content, citations = validate_answer(answer, [], {})
    assert "do not establish" in content and citations == []
