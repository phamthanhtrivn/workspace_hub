"""Exercise the production cache without model weights or external services."""
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
from pathlib import Path
import sys
import threading
import time
import types
import unittest
from unittest import mock


def stub(name, **attributes):
    module = types.ModuleType(name)
    module.__dict__.update(attributes)
    return module


dependencies = {
    "llama_index.core.node_parser": stub("llama_index.core.node_parser", SentenceSplitter=None),
    "llama_index.core.utils": stub("llama_index.core.utils", get_tokenizer=None),
    "qdrant_client": stub("qdrant_client", QdrantClient=None, models=None),
    "app.visual": stub("app.visual", IMAGE_TYPES={}, VisualExtractor=None, enabled=None, open_image=None),
    "app.api_embeddings": stub("app.api_embeddings", ApiEmbeddings=None, GeminiEmbeddings=None),
    "app.manifests": stub("app.manifests", ManifestStore=None, document_filter=None),
}
spec = importlib.util.spec_from_file_location(
    "app._query_cache_test", Path(__file__).parents[1] / "app" / "engine.py",
)
module = importlib.util.module_from_spec(spec)
with mock.patch.dict(sys.modules, dependencies):
    spec.loader.exec_module(module)
Engine = module.Engine


class QueryCacheTest(unittest.TestCase):
    def make(self, embed):
        engine = Engine.__new__(Engine)
        engine.query_lock = threading.Lock()
        engine.query_vectors = OrderedDict()
        engine.query_flights = {}
        engine.embed = mock.Mock(side_effect=embed)
        return engine

    def test_cached_query_does_not_wait_for_an_unrelated_embedding(self):
        started, release = threading.Event(), threading.Event()

        def embed(*_args, **_kwargs):
            started.set()
            release.wait(2)
            return [[1.0]]

        engine = self.make(embed)
        engine.query_vectors[hashlib.sha256(b"cached").digest()] = (time.monotonic(), (2.0,))
        with ThreadPoolExecutor(max_workers=2) as pool:
            slow = pool.submit(engine.query_vector, "slow")
            self.assertTrue(started.wait(1))
            try:
                hit = pool.submit(engine.query_vector, "cached")
                self.assertEqual(hit.result(timeout=1), [2.0])
            finally:
                release.set()
            self.assertEqual(slow.result(timeout=1), [1.0])
        engine.embed.assert_called_once()

    def test_concurrent_duplicate_queries_share_success_and_failure(self):
        for failed in (False, True):
            with self.subTest(failed=failed):
                started, release, waiting = threading.Event(), threading.Event(), threading.Event()

                def embed(*_args, **_kwargs):
                    started.set()
                    release.wait(2)
                    if failed:
                        raise RuntimeError("embedding unavailable")
                    return [[1.0, 2.0]]

                engine = self.make(embed)
                with ThreadPoolExecutor(max_workers=2) as pool:
                    first = pool.submit(engine.query_vector, "same")
                    self.assertTrue(started.wait(1))
                    pending = next(iter(engine.query_flights.values()))
                    original = pending.result

                    def wait(*args, **kwargs):
                        waiting.set()
                        return original(*args, **kwargs)

                    pending.result = wait
                    second = pool.submit(engine.query_vector, "same")
                    try:
                        self.assertTrue(waiting.wait(1))
                    finally:
                        release.set()
                    for future in (first, second):
                        if failed:
                            with self.assertRaisesRegex(RuntimeError, "embedding unavailable"):
                                future.result(timeout=1)
                        else:
                            self.assertEqual(future.result(timeout=1), [1.0, 2.0])
                engine.embed.assert_called_once()
                self.assertEqual(engine.query_flights, {})
                if failed:
                    engine.embed.side_effect = lambda *_args, **_kwargs: [[3.0]]
                    self.assertEqual(engine.query_vector("same"), [3.0])

    def test_expired_queries_refresh_and_cached_vectors_are_copied(self):
        engine = self.make(lambda *_args, **_kwargs: [[1.0, 2.0]])
        key = hashlib.sha256(b"question").digest()
        engine.query_vectors[key] = (time.monotonic() - 121, (0.0,))
        result = engine.query_vector("question")
        result[0] = 99.0
        self.assertEqual(engine.query_vector("question"), [1.0, 2.0])
        engine.embed.assert_called_once()

    def test_query_cache_stays_bounded(self):
        engine = self.make(lambda *_args, **_kwargs: [[1.0]])
        for index in range(130):
            engine.query_vector(str(index))
        self.assertEqual(len(engine.query_vectors), 128)
        self.assertNotIn(hashlib.sha256(b"0").digest(), engine.query_vectors)


if __name__ == "__main__":
    unittest.main()
