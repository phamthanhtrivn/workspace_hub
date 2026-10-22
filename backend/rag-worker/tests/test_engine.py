import base64
from collections import OrderedDict
import json
import os
import threading
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from llama_index.core.node_parser import SentenceSplitter
from qdrant_client import QdrantClient

from app.engine import Engine
from app.main import app
from app.prepared import PreparedCache


class EngineTests(unittest.TestCase):
    def setUp(self):
        # Explicit deterministic test fixture only: production always uses real embeddings.
        self.engine = Engine.__new__(Engine)
        self.engine.client = QdrantClient(":memory:")
        self.engine.collection = "fixture"
        self.engine.tokenizer = str.split
        self.engine.splitter = SentenceSplitter(chunk_size=32, chunk_overlap=4, tokenizer=str.split)
        self.engine.index_lock = threading.Lock()
        self.engine.prepared_cache = PreparedCache()
        self.engine.readiness_lock = threading.Lock()
        self.engine.embedding_verified = False
        self.engine.query_lock = threading.Lock()
        self.engine.query_vectors = OrderedDict()
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

    def test_preflight_reuses_index_limits_without_embeddings_or_vector_writes(self):
        from app.errors import InvalidSource
        content = base64.b64encode(b"A valid source document.").decode()
        with patch.object(self.engine, "embed") as embed, patch.object(self.engine.client, "upsert") as upsert:
            self.assertEqual(self.engine.validate("a.md", content, self.scope), {"chunkCount": 1})
            for name, data in [("empty.txt", b""), ("binary.pdf", b"not a PDF"),
                               ("fake.docx", b"not a zip"), ("large.md", ("word " * 40001).encode())]:
                with self.assertRaises(InvalidSource):
                    self.engine.validate(name, base64.b64encode(data).decode(), self.scope)
            embed.assert_not_called()
            upsert.assert_not_called()

    def test_preflight_returns_precise_safe_reasons_and_rejects_busy_worker(self):
        from types import SimpleNamespace
        key = "fixture-internal-key-not-production-000"
        with patch.dict(os.environ, {"RAG_SERVICE_KEY": key}), patch("app.main.engine", return_value=self.engine):
            client = TestClient(app)
            payload = {"scopeId": self.scope, "name": "a.pdf", "content": base64.b64encode(b"fixture").decode()}
            self.assertEqual(client.post("/validate", json=payload).status_code, 401)
            headers = {"x-internal-service-key": key}
            for pdf, code in [(SimpleNamespace(is_encrypted=True, pages=[]), "PDF_ENCRYPTED"),
                              (SimpleNamespace(is_encrypted=False, pages=[None] * 101), "PDF_PAGE_LIMIT"),
                              (SimpleNamespace(is_encrypted=False, pages=[SimpleNamespace(extract_text=lambda: "", images=[object()])]), "PDF_OCR_REQUIRED")]:
                with patch("pypdf.PdfReader", return_value=pdf):
                    result = client.post("/validate", headers=headers, json=payload)
                self.assertEqual(result.status_code, 422)
                self.assertEqual(result.json()["detail"]["code"], code)
            self.engine.index_lock.acquire()
            try:
                result = client.post("/validate", headers=headers, json=payload)
                self.assertEqual(result.status_code, 503)
                self.assertEqual(result.json()["detail"]["code"], "RAG_BUSY")
            finally:
                self.engine.index_lock.release()

    def test_preflight_rejects_real_101_page_and_encrypted_pdf_before_embedding(self):
        import io
        from pypdf import PdfWriter
        from app.errors import InvalidSource
        for count, encrypted, code in [(101, False, "PDF_PAGE_LIMIT"), (1, True, "PDF_ENCRYPTED")]:
            writer = PdfWriter()
            for _ in range(count):
                writer.add_blank_page(width=100, height=100)
            if encrypted:
                writer.encrypt("fixture-password")
            data = io.BytesIO()
            writer.write(data)
            with patch.object(self.engine, "embed") as embed:
                with self.assertRaises(InvalidSource) as error:
                    self.engine.validate("real-fixture.pdf", base64.b64encode(data.getvalue()).decode(), self.scope)
                self.assertEqual(error.exception.code, code)
                embed.assert_not_called()

    def test_query_cache_is_bounded_expires_and_returns_copies(self):
        with patch.object(self.engine, "embed", wraps=self.engine.embed) as embed:
            with patch("app.engine.time.monotonic", return_value=100):
                vector = self.engine.query_vector("question")
                vector[0] = 99
                self.assertEqual(self.engine.query_vector("question"), [1.0, 0.0, 0.0])
                self.assertEqual(embed.call_count, 1)
            with patch("app.engine.time.monotonic", return_value=221):
                self.engine.query_vector("question")
                self.assertEqual(embed.call_count, 2)
            for i in range(150):
                self.engine.query_vector(f"question {i}")
            self.assertEqual(len(self.engine.query_vectors), 128)

    def test_preflight_twice_then_index_parses_once_without_skipping_embedding(self):
        text = "Trusted content from the same original document."
        content = base64.b64encode(text.encode()).decode()
        with patch.object(self.engine, "parse", wraps=self.engine.parse) as parse:
            with patch.object(self.engine, "embed", wraps=self.engine.embed) as embed:
                self.engine.validate("a.md", content, self.scope)
                self.engine.validate("renamed.md", content, self.scope)
                embed.assert_not_called()
                self.index(text=text)
                self.assertEqual(parse.call_count, 1)
                self.assertEqual(embed.call_count, 1)
        self.assertEqual(self.engine.chunks(self.scope, [self.source])["evidence"][0]["text"], text)

    def test_prepared_cache_never_bypasses_scope_content_type_pipeline_or_expiry(self):
        content = base64.b64encode(b"First version of source document.").decode()
        with patch("app.prepared.time.monotonic", return_value=0):
            self.engine.validate("a.md", content, self.scope)
        with patch.object(self.engine, "parse", wraps=self.engine.parse) as parse:
            with patch("app.prepared.time.monotonic", return_value=1):
                self.engine.validate("a.md", content, self.scope)
                self.assertEqual(parse.call_count, 0)
                self.engine.validate("a.md", content, str(uuid4()))
                self.engine.validate("a.md", base64.b64encode(b"Changed version.").decode(), self.scope)
                with self.assertRaises(ValueError):
                    self.engine.validate("a.pdf", content, self.scope)
                self.engine.collection = "changed-pipeline"
                self.engine.validate("a.md", content, self.scope)
                self.assertEqual(parse.call_count, 4)
            with patch("app.prepared.time.monotonic", return_value=301):
                self.engine.validate("a.md", content, self.scope)
                self.assertEqual(parse.call_count, 5)

    def test_prepared_cache_is_memory_and_entry_bounded_and_purged_on_delete(self):
        cache = PreparedCache(max_bytes=1800, max_entries=2, ttl=300)
        for i in range(5):
            cache.put(("scope", "pipeline", ".md", str(i)), [("x" * 100, 1)])
            self.assertLessEqual(cache.bytes, 1800)
            self.assertLessEqual(len(cache.entries), 2)
        self.assertIsNone(cache.get(("scope", "pipeline", ".md", "0")))
        cache.put(("scope", "pipeline", ".md", "oversized"), [("x" * 10000, 1)])
        self.assertIsNone(cache.get(("scope", "pipeline", ".md", "oversized")))
        content = base64.b64encode(b"Validated private text").decode()
        self.engine.validate("a.md", content, self.scope)
        other_scope = str(uuid4())
        self.engine.validate("a.md", content, other_scope)
        self.engine.delete(self.scope, self.source)
        self.assertTrue(self.engine.prepared_cache.entries)
        self.assertTrue(all(key[0] == other_scope for key in self.engine.prepared_cache.entries))

    def test_metrics_include_stage_times_and_cache_hits_without_private_data(self):
        secret = "private text not for logging"
        content = base64.b64encode(secret.encode()).decode()
        with self.assertLogs("workspace.rag.metrics", level="INFO") as logs:
            self.engine.validate("secret-file.md", content, self.scope)
            self.engine.validate("secret-file.md", content, self.scope)
            self.index(text=secret)
            with patch.object(self.engine, "embed", side_effect=RuntimeError("secret provider body")):
                with self.assertRaises(RuntimeError):
                    self.index(text=secret)
        reports = [json.loads(record.getMessage()) for record in logs.records]
        self.assertEqual([r["prepare_cache_hit"] for r in reports], [0, 1, 1, 1])
        self.assertEqual(reports[-1]["status"], "failed")
        for report in reports:
            for stage in ["parse_ms", "chunk_ms", "embedding_ms", "qdrant_ms", "total_ms"]:
                self.assertGreaterEqual(report[stage], 0)
        for private in [secret, "secret-file.md", "secret provider body", self.scope, self.source]:
            self.assertNotIn(private, "\n".join(logs.output))

    def test_cached_question_never_caches_document_hits_or_crosses_source_scope(self):
        self.index()
        first = self.engine.retrieve(self.scope, [self.source], "same question")["evidence"]
        self.assertEqual(len(first), 1)
        self.assertEqual(self.engine.retrieve(str(uuid4()), [self.source], "same question")["evidence"], [])
        self.engine.delete(self.scope, self.source)
        self.assertEqual(self.engine.retrieve(self.scope, [self.source], "same question")["evidence"], [])

    def test_index_embeds_each_chunk_once_including_first_batch(self):
        pages = [("mock text", 1)]
        chunks = [f"chunk {i}" for i in range(20)]
        with patch.object(self.engine, "parse", return_value=pages), patch.object(type(self.engine.splitter), "split_text", return_value=chunks):
            with patch.object(self.engine, "embed", wraps=self.engine.embed) as embed:
                result = self.index()
                self.assertEqual(result["chunkCount"], 20)
                texts = [text for call in embed.call_args_list for text in call.args[0]]
                self.assertEqual(texts, chunks)
                self.assertEqual(embed.call_count, 2)

    def test_readiness_warms_embeddings_once_and_checks_qdrant_every_time(self):
        with patch.object(self.engine, "embed", wraps=self.engine.embed) as embed:
            self.engine.ready()
            self.engine.ready()
            self.assertEqual(embed.call_count, 1)
        with patch.object(self.engine.client, "get_collections", side_effect=RuntimeError("offline")):
            with self.assertRaises(RuntimeError):
                self.engine.ready()

    def test_readiness_fails_closed_for_model_failure_and_nonfinite_vectors(self):
        for result in ([], [[]], [[float("nan")]]):
            self.engine.embed = lambda texts, result=result: result
            with self.assertRaises(RuntimeError):
                self.engine.ready()
            self.assertFalse(self.engine.embedding_verified)

    def test_model_value_error_is_not_misreported_as_invalid_document(self):
        key = "fixture-internal-key-not-production-000"
        with patch.dict(os.environ, {"RAG_SERVICE_KEY": key}), patch("app.main.engine", return_value=self.engine):
            with patch.object(self.engine, "ready", side_effect=ValueError("secret model configuration")):
                response = TestClient(app).get("/ready", headers={"x-internal-service-key": key})
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()["detail"]["code"], "RAG_DEPENDENCY_FAILED")
                self.assertNotIn("secret", response.text)

    def test_text_pdf_uses_lightweight_parser_and_preserves_page_citations(self):
        from types import SimpleNamespace
        pages = [SimpleNamespace(extract_text=lambda: "First page evidence", images=[]),
                 SimpleNamespace(extract_text=lambda: "Second page evidence", images=[])]
        pdf = SimpleNamespace(is_encrypted=False, pages=pages)
        with patch("pypdf.PdfReader", return_value=pdf):
            result = self.engine.parse("fixture.pdf", base64.b64encode(b"fixture").decode())
        self.assertEqual(result, [("First page evidence", 1), ("Second page evidence", 2)])
        self.assertFalse(hasattr(self.engine, "converter"))

    def test_scan_and_oversize_pdf_are_rejected_without_loading_layout_models(self):
        from types import SimpleNamespace
        scan = SimpleNamespace(extract_text=lambda: "", images=[object()])
        for pdf in [SimpleNamespace(is_encrypted=True, pages=[]),
                    SimpleNamespace(is_encrypted=False, pages=[scan]),
                    SimpleNamespace(is_encrypted=False, pages=[scan] * 101)]:
            with patch("pypdf.PdfReader", return_value=pdf), self.assertRaises(ValueError):
                self.engine.parse("fixture.pdf", base64.b64encode(b"fixture").decode())

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
