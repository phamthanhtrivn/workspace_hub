"""Exercise production scope locking with deterministic concurrent mutations."""
import sys
import threading
import types
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rag_route_cleanup_test import MultiEngine
from app.document_locks import scope_lock
from app.fallback_queue import FallbackQueue


class ScopeDeletionTests(unittest.TestCase):
    def test_delete_waits_for_index_and_fallback_and_rejects_late_work(self):
        for fallback in (False, True):
            with self.subTest(fallback=fallback), ThreadPoolExecutor(max_workers=3) as pool:
                scope = str(uuid4())
                entered, release, deleting = (threading.Event() for _ in range(3))
                vectors, metadata = [], {'fallback': {'status': 'QUEUED'}}
                multi = MultiEngine.__new__(MultiEngine)
                multi.primary = types.SimpleNamespace(vector_cache=types.SimpleNamespace(
                    delete_legacy_routes=lambda *args: None))
                multi.manifests = types.SimpleNamespace(delete=lambda *args: metadata.clear())

                def index(*args):
                    entered.set()
                    if not release.wait(3):
                        raise TimeoutError('Index not released')
                    vectors.append('document')

                multi._index_source = index
                multi._run_all = lambda *args: vectors.clear()
                manifests = types.SimpleNamespace(
                    get=lambda *args: metadata.get('fallback'),
                    put=lambda *args, **kwargs: metadata.update(fallback=kwargs),
                    delete=lambda *args: metadata.pop('fallback', None),
                )
                queue = FallbackQueue(manifests, index, lambda *args: vectors.clear())
                self.addCleanup(queue.close)
                previous = types.SimpleNamespace(collection='previous')
                active = (pool.submit(queue.run, scope, 'source', previous) if fallback else
                          pool.submit(multi.index, scope, 'source', 'r1', 'file.txt', 'text'))
                self.assertTrue(entered.wait(2))

                def delete():
                    deleting.set()
                    multi.delete(scope, None)

                deletion = pool.submit(delete)
                self.assertTrue(deleting.wait(2))
                try:
                    self.assertFalse(deletion.done(), 'delete must wait for the active writer')
                    with self.assertRaises(TimeoutError):
                        deletion.result(timeout=0.05)
                finally:
                    release.set()
                active.result(timeout=3)
                deletion.result(timeout=3)
                self.assertEqual(vectors, [])
                self.assertEqual(metadata, {})
                with self.assertRaisesRegex(ValueError, 'deleted'):
                    multi.index(scope, 'late', 'r1', 'file.txt', 'text')
                with self.assertRaisesRegex(ValueError, 'deleted'):
                    queue.enqueue(scope, 'late', previous)
                queue.run(scope, 'queued-before-delete', previous)
                multi.delete(scope, 'source')  # late source cleanup remains idempotent
                multi.delete(scope, None)
                self.assertEqual(metadata, {})

    def test_distinct_uploads_in_one_notebook_remain_parallel(self):
        scope = str(uuid4())
        barrier = threading.Barrier(2)

        def upload():
            with scope_lock(scope):
                barrier.wait(timeout=2)

        with ThreadPoolExecutor(max_workers=2) as pool:
            first, second = pool.submit(upload), pool.submit(upload)
            first.result(timeout=3)
            second.result(timeout=3)

    def test_admitted_conversion_can_finish_nested_work_while_delete_waits(self):
        scope = str(uuid4())
        with ThreadPoolExecutor(max_workers=1) as pool:
            with scope_lock(scope):
                deletion = pool.submit(self.delete_scope, scope)
                with self.assertRaises(TimeoutError):
                    deletion.result(timeout=0.05)
                with scope_lock(scope), scope_lock(scope, cleanup=True):
                    pass
            deletion.result(timeout=2)
        with self.assertRaisesRegex(ValueError, 'deleted'):
            with scope_lock(scope):
                pass

    @staticmethod
    def delete_scope(scope):
        with scope_lock(scope, deleting=True):
            pass


if __name__ == '__main__':
    unittest.main()
