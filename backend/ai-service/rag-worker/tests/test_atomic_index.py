import threading
import time
from concurrent.futures import ThreadPoolExecutor
import unittest
from types import SimpleNamespace

from qdrant_client import models
from app.engine import Engine
from app.profiling import Profile


def matches(payload, condition):
    if isinstance(condition, models.Filter):
        return (all(matches(payload, item) for item in condition.must or [])
                and (not condition.should or any(matches(payload, item) for item in condition.should))
                and not any(matches(payload, item) for item in condition.must_not or []))
    if isinstance(condition, models.IsEmptyCondition):
        return condition.is_empty.key not in payload
    match = condition.match
    return payload.get(condition.key) in match.any if isinstance(match, models.MatchAny) else payload.get(condition.key) == match.value


class MemoryClient:
    def __init__(self):
        self.points = {}

    def collection_exists(self, _):
        return True

    def upsert(self, _, points, **_kwargs):
        self.points.update({str(point.id): point for point in points})

    def scroll(self, _, scroll_filter=None, **_kwargs):
        return [point for point in self.points.values() if matches(point.payload, scroll_filter)], None

    def count(self, collection, count_filter, **_kwargs):
        return SimpleNamespace(count=len(self.scroll(collection, count_filter)[0]))

    def delete(self, _, points_selector, **_kwargs):
        self.points = {key: point for key, point in self.points.items() if not matches(point.payload, points_selector.filter)}


class MemoryManifest:
    def __init__(self):
        self.items = {}

    def get(self, scope, source, namespace):
        return self.items.get((scope, source, namespace))

    def put(self, scope, source, namespace, **payload):
        self.items[scope, source, namespace] = payload


class AtomicIndexTests(unittest.TestCase):
    def engine(self):
        engine = Engine.__new__(Engine)
        engine.client = MemoryClient()
        engine.collection = 'synthetic'
        engine.manifests = MemoryManifest()
        engine.collection_lock = threading.Lock()
        engine._ensure_collection = lambda _: None
        engine.embed = lambda texts: [[1.0, 2.0] for _ in texts]
        engine.client.points['old'] = SimpleNamespace(id='old', payload={
            'scopeId': 'scope', 'sourceId': 'source', 'revision': 'old', 'position': 0, 'text': 'old complete content'})
        return engine

    def test_midway_embedding_failure_preserves_old_index_and_hides_staging(self):
        engine = self.engine()
        def embed(texts):
            if 'new 16' in texts:
                raise RuntimeError('synthetic unavailable model')
            return [[1.0] for _ in texts]
        engine.embed = embed
        chunks = [(f'new {i}', 1, None) for i in range(17)]
        with self.assertRaises(RuntimeError):
            engine._index('scope', 'source', 'new', 'test.txt', '', Profile('test'), chunks=chunks)
        self.assertEqual([item['text'] for item in engine.chunks('scope', ['source'])['evidence']], ['old complete content'])
        self.assertEqual(engine.manifests.items, {})

    def test_complete_generation_is_activated_and_old_points_removed(self):
        engine = self.engine()
        engine._index('scope', 'source', 'new', 'test.txt', '', Profile('test'), chunks=[('new content', 1, None)])
        self.assertEqual([item['text'] for item in engine.chunks('scope', ['source'])['evidence']], ['new content'])
        self.assertEqual(len(engine.client.points), 1)
        self.assertEqual(engine.manifests.get('scope', 'source', 'synthetic')['revision'], 'new')

    def test_manifest_write_failure_leaves_previous_generation_readable(self):
        engine = self.engine()
        def fail(*_args, **_kwargs):
            raise RuntimeError('synthetic manifest failure')
        engine.manifests.put = fail
        with self.assertRaises(RuntimeError):
            engine._index('scope', 'source', 'new', 'test.txt', '', Profile('test'), chunks=[('new content', 1, None)])
        self.assertEqual([item['text'] for item in engine.chunks('scope', ['source'])['evidence']], ['old complete content'])

    def test_concurrent_reindex_of_one_source_cannot_delete_the_winning_generation(self):
        engine = self.engine()
        active = peak = 0
        def embed(texts):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            time.sleep(.02)
            active -= 1
            return [[1.0] for _ in texts]
        engine.embed = embed
        with ThreadPoolExecutor(max_workers=2) as pool:
            tasks = [pool.submit(engine._index, 'scope', 'source', name, 'test.txt', '', Profile('test'),
                                 chunks=[(name, 1, None)]) for name in ('first', 'second')]
            for task in tasks:
                task.result()
        self.assertEqual(peak, 1)
        self.assertEqual(len(engine.chunks('scope', ['source'])['evidence']), 1)
        self.assertEqual(len(engine.client.points), 1)


if __name__ == '__main__':
    unittest.main(argv=['test_atomic_index'], verbosity=2)
