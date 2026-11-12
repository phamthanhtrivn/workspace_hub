"""Exercise route migration and the real SQLite cache without loading models."""
import importlib.util
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
import sqlite3
import sys
import tempfile
import time
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'ai-service' / 'rag-worker'))

# Route/cache tests need no Qdrant server, HTTP transport or embedding packages.
if importlib.util.find_spec('qdrant_client') is None:
    qdrant = types.ModuleType('qdrant_client')
    qdrant.models = types.SimpleNamespace()
    sys.modules['qdrant_client'] = qdrant
if importlib.util.find_spec('httpx') is None:
    httpx = types.ModuleType('httpx')
    httpx.HTTPStatusError = type('HTTPStatusError', (Exception,), {})
    sys.modules['httpx'] = httpx
engine_module = types.ModuleType('app.engine')
engine_module.Engine = type('Engine', (), {})
sys.modules['app.engine'] = engine_module

from app.manifests import ManifestStore
from app.multi_engine import MultiEngine
from app.vector_cache import VectorCache
from app.errors import FallbackPending


class MemoryManifests(ManifestStore):
    def __init__(self):
        self.records = {}
        self.writes = 0

    def get(self, scope, source, namespace='route'):
        return self.records.get((scope, source, namespace))

    def put(self, scope, source, namespace='route', **payload):
        self.records[scope, source, namespace] = payload
        self.writes += 1


class RouteCleanupTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='rag-route-test-')
        self.addCleanup(directory.cleanup)
        self.path = str(Path(directory.name) / 'cache.sqlite3')

    def cache(self, legacy=False):
        if legacy:
            with closing(sqlite3.connect(self.path)) as connection, connection:
                connection.execute('CREATE TABLE routes (scope TEXT, source TEXT, collection TEXT)')
                connection.execute("INSERT INTO routes VALUES ('scope','source','secondary')")
        cache = VectorCache(self.path)
        self.addCleanup(cache.close)
        return cache

    def multi(self, cache, manifests):
        def engine(collection):
            return types.SimpleNamespace(
                collection=collection, provider='gemini', model_name=collection,
                model=None, manifests=manifests, vector_cache=cache, close=lambda: None,
            )
        multi = MultiEngine(engine('primary'), engine('secondary'), strategy='shard')
        self.addCleanup(multi.close)
        return multi

    def test_fresh_vector_cache_does_not_create_route_storage(self):
        cache = self.cache()
        self.assertIsNone(cache.legacy_route('scope', 'source'))
        cache.delete_legacy_routes('scope')
        self.assertIsNone(cache.connection.execute(
            "SELECT 1 FROM sqlite_master WHERE name='routes'").fetchone())
        calls = []

        def embed(texts):
            calls.append(texts)
            return [[1.0, 0.5] for _ in texts]

        first, _, misses = cache.embed('scope', 'model', ['text'], embed)
        second, hits, _ = cache.embed('scope', 'model', ['text'], embed)
        self.assertEqual(first, second)
        self.assertEqual((misses, hits, len(calls)), (1, 1, 1))

    def test_existing_sqlite_route_is_promoted_once_and_qdrant_takes_precedence(self):
        cache = self.cache(legacy=True)
        manifests = MemoryManifests()
        multi = self.multi(cache, manifests)
        self.assertEqual(multi.owner('scope', 'source').collection, 'secondary')
        self.assertEqual(manifests.writes, 1)
        cache.delete_legacy_routes('scope', 'source')
        self.assertEqual(multi.owner('scope', 'source').collection, 'secondary')
        self.assertEqual(manifests.writes, 1)
        multi.remember('scope', 'source', multi.primary)
        self.assertEqual(multi.owner('scope', 'source').collection, 'primary')
        self.assertIsNone(cache.legacy_route('scope', 'source'))

    def test_route_to_a_removed_model_is_rejected(self):
        cache = self.cache()
        manifests = MemoryManifests()
        manifests.put('scope', 'source', collection='removed')
        with self.assertRaisesRegex(ValueError, 'migrate before removing'):
            self.multi(cache, manifests).owner('scope', 'source')

    def test_concurrent_route_reads_promote_the_legacy_route_once(self):
        cache = self.cache(legacy=True)
        manifests = MemoryManifests()
        original_get = manifests.get

        def slow_get(*args):
            route = original_get(*args)
            time.sleep(0.01)
            return route

        manifests.get = slow_get
        with ThreadPoolExecutor(max_workers=4) as pool:
            owners = list(pool.map(lambda _: manifests.route('scope', 'source', cache), range(4)))
        self.assertEqual(owners, ['secondary'] * 4)
        self.assertEqual(manifests.writes, 1)

    def test_unrouted_sources_keep_deterministic_shard_ownership(self):
        cache = self.cache()
        manifests = MemoryManifests()
        multi = self.multi(cache, manifests)
        self.assertIs(multi.owner('scope', 'source'), multi.owner('scope', 'source'))
        self.assertEqual(manifests.writes, 0)

    def test_quota_exhausted_shard_queues_fallback_without_inline_inference(self):
        cache = self.cache()
        manifests = MemoryManifests()
        manifests.put('scope', 'source', collection='primary')
        multi = self.multi(cache, manifests)
        multi.primary.client = types.SimpleNamespace(
            collection_exists=lambda collection: True,
            count=lambda collection, **kwargs: types.SimpleNamespace(count=2),
        )
        multi.primary.scope_filter = lambda *args: None
        multi.quota_until['primary'] = time.monotonic() + 60
        queued = []
        multi.fallbacks.enqueue = lambda *args: queued.append(args)
        multi.local_copy = lambda *args: self.fail('inline inference started')
        with self.assertRaises(FallbackPending):
            multi.groups('scope', ['source'])
        self.assertEqual(queued, [('scope', 'source', multi.primary)])


if __name__ == '__main__':
    unittest.main()
