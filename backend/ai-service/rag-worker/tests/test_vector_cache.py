import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from app.vector_cache import VectorCache


class CacheTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = str(Path(self.directory.name) / 'vectors.sqlite3')
        self.cache = VectorCache(self.path, max_entries=3)

    def tearDown(self):
        self.cache.close()
        self.directory.cleanup()

    def test_persistence_scope_and_model_isolation(self):
        self.cache.put('notebook', 'model', [('text', [1.0, 2.0])])
        self.cache.close()
        self.cache = VectorCache(self.path)
        key = self.cache.digest('text')
        self.assertEqual(self.cache.get('notebook', 'model', [key])[key], [1.0, 2.0])
        self.assertEqual(self.cache.get('other', 'model', [key]), {})
        self.assertEqual(self.cache.get('notebook', 'other', [key]), {})

    def test_duplicates_and_changed_chunks_only_generate_missing(self):
        calls = []
        def generate(texts):
            calls.append(texts)
            return [[1.0, 2.0] for _ in texts]
        _, hits, misses = self.cache.embed('scope', 'model', ['a', 'a', 'b'], generate)
        self.assertEqual((hits, misses), (1, 2))
        _, hits, misses = self.cache.embed('scope', 'model', ['a', 'c'], generate)
        self.assertEqual((hits, misses), (1, 1))
        self.assertEqual(calls[1], ['c'])

    def test_concurrent_duplicate_requests_share_generation(self):
        calls = []
        barrier = threading.Barrier(3)
        def generate(texts):
            calls.append(texts)
            time.sleep(0.05)
            return [[1.0] for _ in texts]
        def run():
            barrier.wait()
            return self.cache.embed('scope', 'model', ['same'], generate)
        with ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(lambda _: run(), range(3)))
        self.assertEqual(len(calls), 1)
        self.assertEqual(sum(item[2] for item in results), 1)
        self.assertEqual(self.cache.flights, {})

    def test_invalid_result_releases_locks_and_eviction_is_bounded(self):
        with self.assertRaises(ValueError):
            self.cache.embed('scope', 'model', ['a'], lambda _: [[float('nan')]])
        self.assertEqual(self.cache.flights, {})
        self.cache.put('scope', 'model', [(str(i), [1.0]) for i in range(5)])
        self.assertEqual(self.cache.connection.execute('SELECT count(*) FROM vectors').fetchone()[0], 3)
        self.cache.clear_scope('scope')
        self.assertEqual(self.cache.connection.execute('SELECT count(*) FROM vectors').fetchone()[0], 0)

    def test_document_routes_survive_restart_and_delete_separately(self):
        self.cache.set_route('scope', 'source', 'model-local')
        self.cache.clear_scope('scope')
        self.cache.close()
        self.cache = VectorCache(self.path)
        self.assertEqual(self.cache.route('scope', 'source'), 'model-local')
        self.assertIsNone(self.cache.route('other', 'source'))
        self.cache.delete_routes('scope', 'source')
        self.assertIsNone(self.cache.route('scope', 'source'))


if __name__ == '__main__':
    unittest.main(argv=['test_vector_cache'], verbosity=2)
