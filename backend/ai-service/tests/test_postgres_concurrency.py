from concurrent.futures import ThreadPoolExecutor

import pytest

from app.common.errors import ApiError
from app.modules.conversations.schemas import CreateConversation, CreateMessage
from app.modules.conversations.service import ConversationService
from app.modules.jobs.runner import claim
from tests.test_documents_qa import process_pending, register


def test_postgres_skip_locked_never_claims_same_job_twice(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    if database.engine.dialect.name != "postgresql":
        pytest.skip("PostgreSQL locking requires .github/ci/ai/compose.yml")
    register(feature_setup)
    with ThreadPoolExecutor(max_workers=2) as executor:
        claimed = list(executor.map(lambda _: claim(database, settings), range(2)))
    assert claimed[0][0] != claimed[1][0]


def test_postgres_serializes_two_generations_for_same_conversation(feature_setup):
    database, settings, documents, actor, ids = feature_setup
    if database.engine.dialect.name != "postgresql":
        pytest.skip("PostgreSQL locking requires .github/ci/ai/compose.yml")
    batch = register(feature_setup)
    process_pending(database, documents, settings)
    service = ConversationService(database, documents)
    conversation = service.create(
        actor,
        CreateConversation(sourceIds=[value["sourceId"] for value in batch["documents"]]),
        "conversation",
    )

    def submit(key):
        try:
            return service.send(
                actor, conversation["id"], CreateMessage(content="Compare dates"), key
            )
        except ApiError as error:
            return error.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(submit, ("first", "second")))
    assert sum(isinstance(result, dict) for result in results) == 1
    assert 409 in results
