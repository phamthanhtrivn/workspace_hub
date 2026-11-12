import sys
import time
import types
import unittest
from contextlib import contextmanager
from unittest import mock

# Heavy dependencies are not installed in the test venv: stub them before importing app.multi_engine.
engine_stub = types.ModuleType("app.engine")
engine_stub.Engine = type("Engine", (), {})
sys.modules.setdefault("app.engine", engine_stub)
if "qdrant_client" not in sys.modules:
    qdrant_stub = types.ModuleType("qdrant_client")
    qdrant_stub.models = types.ModuleType("qdrant_client.models")
    sys.modules["qdrant_client"] = qdrant_stub
    sys.modules["qdrant_client.models"] = qdrant_stub.models
try:
    import httpx  # noqa: F401
except ImportError:
    httpx_stub = types.ModuleType("httpx")
    httpx_stub.HTTPStatusError = type("HTTPStatusError", (Exception,), {})
    sys.modules["httpx"] = httpx_stub

from app import multi_engine  # noqa: E402
from app.multi_engine import MultiEngine  # noqa: E402


class FakeEngine:
    def __init__(self, name, provider="remote", evidence=None):
        self.collection = f"col_{name}"
        self.provider = provider
        self.model_name = name
        self.model = name
        self.client = None
        self.index_lock = None
        self.manifests = None
        self.vector_cache = None
        self.evidence = evidence or []
        self.deleted = []

    def ready(self):
        pass

    def retrieve(self, scope, sources, question):
        return {"evidence": list(self.evidence)}

    def delete(self, *args):
        self.deleted.append(args)
        return {"ok": True}

    def close(self):
        pass


def chunk(id, position, source="s1", text="text"):
    return {"id": id, "sourceId": source, "position": position, "text": text}


class MultiEngineTest(unittest.TestCase):
    def make(self, *engines, strategy="ensemble"):
        multi = MultiEngine(*engines, strategy=strategy)
        self.addCleanup(multi.pool.shutdown, wait=True)
        return multi

    def test_ready_shard_recovers_after_quota_expires(self):
        a, b = FakeEngine("a"), FakeEngine("b")
        multi = self.make(a, b, strategy="shard")
        multi.quota_until[a.collection] = time.monotonic() - 1
        multi.ready()

    def test_local_fallback_checks_completeness_once(self):
        for complete in (False, True):
            with self.subTest(complete=complete):
                remote, local = FakeEngine('remote'), FakeEngine('local', provider='local')
                multi = self.make(remote, local, strategy='shard')
                remote.scope_filter = mock.Mock(return_value='scope-filter')
                remote.client = mock.Mock()
                remote.client.scroll.return_value = ([types.SimpleNamespace(payload={
                    'revision': 'r', 'position': 0, 'text': 'content', 'page': 1,
                })], None)
                local._index = mock.Mock(return_value={'chunkCount': 1})
                with mock.patch.object(MultiEngine, '_complete', return_value=complete) as check:
                    self.assertIs(multi.local_copy('scope', 'source', remote), local)
                check.assert_called_once()
                self.assertEqual(local._index.call_count, int(not complete))

    def test_ready_shard_fails_while_quota_active_without_local(self):
        a, b = FakeEngine("a"), FakeEngine("b")
        multi = self.make(a, b, strategy="shard")
        multi.quota_until[a.collection] = time.monotonic() + 100
        with self.assertRaises(RuntimeError):
            multi.ready()

    def test_ready_shard_ok_while_quota_active_with_local(self):
        a, b = FakeEngine("a"), FakeEngine("b", provider="local")
        multi = self.make(a, b, strategy="shard")
        multi.quota_until[a.collection] = time.monotonic() + 100
        multi.ready()

    def test_ensemble_retrieve_fuses_same_chunk_across_models(self):
        a = FakeEngine(
            "a", evidence=[chunk("a-1", 0), chunk("a-2", 1), chunk("a-3", 2)]
        )
        b = FakeEngine("b", evidence=[chunk("b-9", 5), chunk("b-1", 0)])
        multi = self.make(a, b)
        result = multi.retrieve("scope", ["s1"], "q")["evidence"]
        self.assertEqual(len(result), 4)
        self.assertEqual(
            [(item["sourceId"], item["position"]) for item in result].count(("s1", 0)),
            1,
        )
        # Consensus chunk ranks first and keeps the first model's id.
        self.assertEqual(result[0]["id"], "a-1")
        self.assertEqual({item["id"] for item in result}, {"a-1", "a-2", "a-3", "b-9"})

    def test_delete_with_source_takes_route_lock(self):
        a, b = FakeEngine("a"), FakeEngine("b")
        multi = self.make(a, b)
        events = []

        @contextmanager
        def recording(scope, source, namespace="route"):
            events.append(("enter", scope, source, namespace))
            try:
                yield
            finally:
                events.append(("exit", scope, source, namespace))

        original = a.delete

        def delete(*args):
            events.append(("delete",))
            return original(*args)

        a.delete = delete
        with mock.patch.object(multi_engine, "document_lock", recording):
            self.assertEqual(multi.delete("scope", "src"), {"ok": True})
        self.assertEqual(events[0], ("enter", "scope", "src", "route"))
        self.assertIn(("delete",), events)
        self.assertEqual(events[-1], ("exit", "scope", "src", "route"))
        self.assertEqual(a.deleted, [("scope", "src")])
        self.assertEqual(b.deleted, [("scope", "src")])

    def test_delete_scope_wide_does_not_take_lock(self):
        a, b = FakeEngine("a"), FakeEngine("b")
        multi = self.make(a, b)
        with mock.patch.object(multi_engine, "document_lock") as lock:
            self.assertEqual(multi.delete("scope"), {"ok": True})
            self.assertEqual(multi.delete("scope", None), {"ok": True})
        lock.assert_not_called()
        self.assertEqual(a.deleted, [("scope",), ("scope", None)])


if __name__ == "__main__":
    unittest.main()
