import base64
import os
import threading
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from llama_index.core.node_parser import SentenceSplitter
from qdrant_client import QdrantClient

from app.engine import Engine
from app.main import app, engine as get_engine


class EngineTests(unittest.TestCase):
    def setUp(self):
        # Explicit deterministic test fixture only: production always uses real embeddings.
        self.engine = Engine.__new__(Engine)
        self.engine.client = QdrantClient(":memory:")
        self.engine.collection = "fixture"
        self.engine.tokenizer = str.split
        self.engine.splitter = SentenceSplitter(chunk_size=32, chunk_overlap=4, tokenizer=str.split)
        self.engine.index_lock = threading.Lock()
        self.engine.embed = lambda texts, query=False: [[1.0, 0.0, 0.0] for _ in texts]
        self.scope = str(uuid4())
        self.source = str(uuid4())

    def tearDown(self):
        self.engine.client.close()
        app.dependency_overrides.clear()

    def index(self, scope=None, source=None, text="Nguồn nghiên cứu tiếng Việt. Dữ liệu có thể đối chiếu."):
        return self.engine.index(scope or self.scope, source or self.source, "a" * 64, "fixture.md", base64.b64encode(text.encode()).decode())

    def test_index_is_idempotent_and_scope_is_always_filtered(self):
        self.index()
        other_scope, other_source = str(uuid4()), str(uuid4())
        self.index(other_scope, other_source, "Private other tenant data.")
        self.index()
        chunks = self.engine.chunks(self.scope, [self.source])["evidence"]
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["sourceId"], self.source)
        retrieved = self.engine.retrieve(self.scope, [self.source], "nghiên cứu")["evidence"]
        self.assertEqual({item["sourceId"] for item in retrieved}, {self.source})
        self.assertEqual(self.engine.retrieve(self.scope, [other_source], "Private")["evidence"], [])
        self.engine.delete(self.scope)
        self.assertEqual(self.engine.chunks(self.scope, [self.source])["evidence"], [])
        self.assertEqual(len(self.engine.chunks(other_scope, [other_source])["evidence"]), 1)

    def test_parser_limits_before_vectorization(self):
        for name, content in [("bad.exe", b"content"), ("empty.txt", b""), ("binary.txt", b"a\x00b")]:
            with self.assertRaises(ValueError):
                self.engine.parse(name, base64.b64encode(content).decode())
        with self.assertRaises(ValueError):
            self.engine.parse("long.md", base64.b64encode(("word " * 40001).encode()).decode())

    def test_http_internal_auth_validation_and_redacted_failures(self):
        key = "fixture-internal-key-not-production-000"
        with patch.dict(os.environ, {"RAG_SERVICE_KEY": key}), patch("app.main.engine", return_value=self.engine):
            client = TestClient(app)
            self.assertEqual(client.post("/retrieve", json={}).status_code, 401)
            headers = {"x-internal-service-key": key}
            self.assertEqual(client.post("/retrieve", headers=headers, json={"scopeId": self.scope, "sourceIds": [], "question": "q"}).status_code, 422)
            self.engine.model = None
            self.assertEqual(client.get("/ready", headers=headers).status_code, 200)
            with patch.object(self.engine, "retrieve", side_effect=RuntimeError("secret prompt and API key")):
                result = client.post("/retrieve", headers=headers, json={"scopeId": self.scope, "sourceIds": [self.source], "question": "q"})
                self.assertEqual(result.status_code, 503)
                self.assertNotIn("secret", result.text)

    def test_only_dedicated_current_and_previous_keys_are_accepted(self):
        with patch("app.main.engine", return_value=self.engine):
            self.engine.model = None
            client = TestClient(app)
            headers = {"x-internal-service-key": "local-internal-key"}
            for mode in ("development", "production"):
                for weak in ("", "local-internal-key"):
                    with patch.dict(os.environ, {"NODE_ENV": mode, "INTERNAL_SERVICE_KEY": "local-internal-key", "RAG_SERVICE_KEY": weak}):
                        self.assertEqual(client.get("/ready", headers=headers).status_code, 401)
            key, previous = "fixture-rag-current-not-production-000", "fixture-rag-previous-not-production-000"
            with patch.dict(os.environ, {"RAG_SERVICE_KEY": key, "RAG_SERVICE_KEY_PREVIOUS": previous}):
                for accepted in (key, previous):
                    self.assertEqual(client.get("/ready", headers={"x-internal-service-key": accepted}).status_code, 200)
                for rejected in ("", "fixture-ai-document-not-production-000", "local-internal-key"):
                    self.assertEqual(client.get("/ready", headers={"x-internal-service-key": rejected}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
