from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.common.errors import ApiError
from app.core.auth import Actor
from app.main import create_app
from app.modules.conversations.schemas import CreateConversation, CreateMessage
from app.modules.conversations.service import ConversationService
from app.modules.documents.models import DocumentIndex
from app.modules.documents.schemas import RegisterDocuments
from app.modules.documents.service import DocumentService
from app.modules.jobs.models import Job
from app.modules.jobs.runner import claim, execute
from tests.feature_fakes import ProviderFake

TEST_SECRET = "test-only-signing-secret-with-32-characters"


def process_pending(database, documents, settings, provider=ProviderFake):
    while job := claim(database, settings):
        execute(database, documents, settings, *job, provider_factory=provider)


def register(setup, key="registration"):
    database, settings, documents, actor, document_ids = setup
    service = DocumentService(database, documents, settings)
    request = RegisterDocuments(documents=[{"documentId": value} for value in document_ids])
    return service.register(actor, request, key)


def test_batch_processing_conversation_followup_and_citations(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    registered = register(feature_setup)
    process_pending(database, documents, settings)
    service = ConversationService(database, documents)
    conversation = service.create(
        actor,
        CreateConversation(sourceIds=[doc["sourceId"] for doc in registered["documents"]]),
        "conversation",
    )
    question = service.send(
        actor, conversation["id"], CreateMessage(content="Compare the delivery dates"), "question"
    )
    assert (
        service.send(
            actor,
            conversation["id"],
            CreateMessage(content="Compare the delivery dates"),
            "question",
        )
        == question
    )
    with pytest.raises(ApiError) as conflict:
        service.send(
            actor, conversation["id"], CreateMessage(content="Another question"), "another"
        )
    assert conflict.value.detail["code"] == "CONVERSATION_BUSY"
    process_pending(database, documents, settings)
    messages = service.messages(actor, conversation["id"], 0, 20)["messages"]
    assert messages[1]["status"] == "COMPLETED"
    assert {citation["documentId"] for citation in messages[1]["citations"]} == set(ids)
    assert all(citation["excerpt"] for citation in messages[1]["citations"])
    service.send(
        actor, conversation["id"], CreateMessage(content="Which one is later?"), "followup"
    )
    process_pending(database, documents, settings)
    assert len(service.messages(actor, conversation["id"], 0, 20)["messages"]) == 4
    assert documents.access_calls >= 10


def test_invalid_bytes_never_embedded_and_other_file_succeeds(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    documents.add(ids[0], "fake.pdf", b"This is not a PDF", "application/pdf")
    registered = register(feature_setup)
    process_pending(database, documents, settings)
    service = DocumentService(database, documents, settings)
    failed = service.get(actor, registered["documents"][0]["sourceId"])
    ready = service.get(actor, registered["documents"][1]["sourceId"])
    assert failed["status"] == "FAILED"
    assert failed["error"]["code"] == "INVALID_FILE_CONTENT"
    assert ready["status"] == "READY"
    with database.sessions() as session:
        failed_index = session.get(DocumentIndex, failed["indexId"])
        assert failed_index.chunk_count == 0
    with pytest.raises(ApiError) as not_ready:
        ConversationService(database, documents).create(
            actor,
            CreateConversation(sourceIds=[doc["sourceId"] for doc in registered["documents"]]),
            "conversation",
        )
    assert not_ready.value.status_code == 409
    assert ProviderFake.embeddings == 1


def test_metadata_failure_is_atomic_and_idempotency_rejects_changed_payload(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    documents.add(ids[1], "script.exe", b"test", "application/octet-stream")
    with pytest.raises(ApiError):
        register(feature_setup)
    with database.sessions() as session:
        assert session.scalar(select(Job.id)) is None
    documents.add(ids[1], "notes.txt", b"valid")
    result = register(feature_setup)
    assert register(feature_setup) == result
    with pytest.raises(ApiError) as conflict:
        DocumentService(database, documents, settings).register(
            actor, RegisterDocuments(documents=[{"documentId": ids[0]}]), "registration"
        )
    assert conflict.value.status_code == 409


def test_revoked_source_blocks_generation_and_all_history(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    registered = register(feature_setup)
    process_pending(database, documents, settings)
    service = ConversationService(database, documents)
    conversation = service.create(
        actor,
        CreateConversation(sourceIds=[doc["sourceId"] for doc in registered["documents"]]),
        "conversation",
    )
    reply = service.send(
        actor, conversation["id"], CreateMessage(content="Compare dates"), "question"
    )
    embeddings = ProviderFake.embeddings
    documents.denied.add(ids[0])
    process_pending(database, documents, settings)
    assert ProviderFake.embeddings == embeddings
    with pytest.raises(ApiError):
        service.messages(actor, conversation["id"], 0, 20)
    with database.sessions() as session:
        assert session.get(Job, reply["jobId"]).status == "FAILED"
    with pytest.raises(ApiError) as inaccessible:
        service.get(Actor(str(uuid4()), "other@example.test"), conversation["id"])
    assert inaccessible.value.status_code == 404


def test_feature_http_validation_and_auth(feature_setup, monkeypatch):
    database, settings, documents, actor, ids = feature_setup
    monkeypatch.setattr("app.core.runtime.Database", lambda url: database)
    monkeypatch.setattr("app.core.runtime.DocumentClient", lambda config: documents)
    app = create_app(settings)
    payload = {
        "documents": [{"name": "bad.exe", "mimeType": "application/octet-stream", "sizeBytes": 100}]
    }
    claims = {
        "sub": actor.id,
        "email": actor.email,
        "role": "USER",
        "iss": "workspace-hub",
        "exp": datetime.now(UTC) + timedelta(minutes=5),
    }
    token = jwt.encode(claims, TEST_SECRET, algorithm="HS256")
    with TestClient(app) as client:
        assert client.post("/api/ai/documents/validate", json=payload).status_code == 401
        response = client.post(
            "/api/ai/documents/validate", json=payload, headers={"Authorization": "Bearer " + token}
        )
        assert response.status_code == 400
        assert response.json()["errors"]["documents"]["0"]["code"] == "UNSUPPORTED_FILE_TYPE"
        for role in ("RESET_PASSWORD_ROLE", "other"):
            bad = jwt.encode({**claims, "role": role}, TEST_SECRET, algorithm="HS256")
            assert (
                client.post(
                    "/api/ai/documents/validate",
                    json=payload,
                    headers={"Authorization": "Bearer " + bad},
                ).status_code
                == 401
            )


def test_query_uses_pinned_embedding_after_configuration_changes(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    registered = register(feature_setup)
    process_pending(database, documents, settings)
    service = ConversationService(database, documents)
    conversation = service.create(
        actor,
        CreateConversation(sourceIds=[doc["sourceId"] for doc in registered["documents"]]),
        "conversation",
    )
    pinned_model = settings.gemini_embedding_model
    settings.gemini_embedding_model = "another-configured-model"
    requested_models = []

    class RecordingProvider(ProviderFake):
        def embed(self, content, **kwargs):
            requested_models.append(kwargs.get("model"))
            return super().embed(content, **kwargs)

    service.send(actor, conversation["id"], CreateMessage(content="Compare dates"), "question")
    process_pending(database, documents, settings, provider=RecordingProvider)
    assert requested_models == [pinned_model]
    assert (
        service.messages(actor, conversation["id"], 0, 20)["messages"][1]["status"] == "COMPLETED"
    )


def test_configuration_change_creates_new_index_and_blocks_old_pending_job(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    original = register(feature_setup)
    settings.gemini_embedding_model = "another-configured-model"
    process_pending(database, documents, settings)
    assert ProviderFake.embeddings == 0
    with database.sessions() as session:
        assert all(
            session.get(DocumentIndex, value["indexId"]).error["code"] == "SOURCE_CHANGED"
            for value in original["documents"]
        )
    updated = register(feature_setup, key="new-configuration")
    assert {value["indexId"] for value in original["documents"]}.isdisjoint(
        {value["indexId"] for value in updated["documents"]}
    )
