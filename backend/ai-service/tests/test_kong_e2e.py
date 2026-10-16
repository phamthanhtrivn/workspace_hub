import os
import time
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
import jwt
import pytest

from tests.kong_stack import DOCUMENT_IDS

pytestmark = pytest.mark.skipif(
    not os.environ.get("KONG_TEST_URL"),
    reason="GitHub Actions supplies real Kong via .github/ci/ai/compose.yml",
)


def test_real_kong_auth_validation_and_internal_route_isolation():
    token = jwt.encode(
        {
            "sub": str(uuid4()),
            "email": "demo@example.test",
            "role": "USER",
            "iss": "workspace-hub",
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        os.environ["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    metadata = {"documents": [{"name": "notes.txt", "mimeType": "text/plain", "sizeBytes": 20}]}
    with httpx.Client(base_url=os.environ["KONG_TEST_URL"], timeout=15) as client:
        assert client.get("/health/ai").status_code == 200
        assert client.post("/api/ai/documents/validate", json=metadata).status_code == 401
        headers = {"Authorization": "Bearer " + token, "X-User-Id": str(uuid4())}
        accepted = client.post("/api/ai/documents/validate", json=metadata, headers=headers)
        assert accepted.status_code == 200
        assert accepted.json()["success"] is True
        metadata["documents"][0]["name"] = "malware.exe"
        rejected = client.post("/api/ai/documents/validate", json=metadata, headers=headers)
        assert rejected.status_code == 400
        assert rejected.json()["errors"]["documents"]["0"]["code"] == "UNSUPPORTED_FILE_TYPE"
        assert (
            client.post("/internal/ai/documents/resolve", json={}, headers=headers).status_code
            == 404
        )


def test_real_kong_multi_document_batch_question_followup_and_delete():
    token = jwt.encode(
        {
            "sub": str(uuid4()),
            "email": "demo@example.test",
            "role": "USER",
            "iss": "workspace-hub",
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        os.environ["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    with httpx.Client(
        base_url=os.environ["KONG_TEST_URL"] + "/api/ai",
        headers={"Authorization": "Bearer " + token},
        timeout=15,
    ) as client:

        def post(path, payload):
            return client.post(path, json=payload, headers={"Idempotency-Key": str(uuid4())})

        def wait_for_job(job_id):
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline:
                response = client.get("/jobs/" + job_id)
                assert response.status_code == 200
                job = response.json()["data"]
                if job["status"] in ("SUCCEEDED", "FAILED", "PARTIAL"):
                    return job
                time.sleep(0.2)
            pytest.fail("Durable job did not finish within the integration timeout")

        registered = post(
            "/documents", {"documents": [{"documentId": value} for value in DOCUMENT_IDS]}
        )
        assert registered.status_code == 202
        batch = registered.json()["data"]
        assert wait_for_job(batch["batchJobId"])["status"] == "PARTIAL"
        selected = [value["sourceId"] for value in batch["documents"]]
        assert post("/conversations", {"sourceIds": selected}).status_code == 409
        created = post("/conversations", {"sourceIds": selected[:2]})
        assert created.status_code == 201
        conversation_id = created.json()["data"]["id"]
        for question in ("Compare delivery dates", "Which one is later?"):
            accepted = post(f"/conversations/{conversation_id}/messages", {"content": question})
            assert accepted.status_code == 202
            assert wait_for_job(accepted.json()["data"]["jobId"])["status"] == "SUCCEEDED"
        messages = client.get(f"/conversations/{conversation_id}/messages").json()["data"][
            "messages"
        ]
        assert len(messages) == 4
        for reply in messages[1::2]:
            assert reply["status"] == "COMPLETED"
            assert {citation["documentId"] for citation in reply["citations"]} == set(
                DOCUMENT_IDS[:2]
            )
            assert all(citation["versionId"] == "original" for citation in reply["citations"])
        assert client.delete(f"/conversations/{conversation_id}").status_code == 200
        assert client.get(f"/conversations/{conversation_id}/messages").status_code == 404
