import threading
import unittest
from types import SimpleNamespace
from app.fallback_queue import FallbackQueue


class Store:
    def __init__(self):
        self.items = {}

    def get(self, scope, source, namespace):
        return self.items.get((scope, source, namespace))

    def put(self, scope, source, namespace, **payload):
        self.items[scope, source, namespace] = payload

    def delete(self, scope, source, namespace):
        self.items.pop((scope, source, namespace), None)


class FallbackTests(unittest.TestCase):
    def test_conversion_is_queued_once_and_never_runs_in_request_thread(self):
        store, started, release = Store(), threading.Event(), threading.Event()
        calls = []
        def convert(*args):
            calls.append(threading.get_ident())
            started.set()
            release.wait(3)
        queue = FallbackQueue(store, convert, lambda *_: None)
        try:
            engine = SimpleNamespace(collection='old-model')
            queue.enqueue('scope', 'source', engine)
            self.assertTrue(started.wait(2))
            queue.enqueue('scope', 'source', engine)
            self.assertEqual(len(calls), 1)
            self.assertNotEqual(calls[0], threading.get_ident())
        finally:
            release.set()
            queue.close()

    def test_removing_document_during_conversion_cleans_late_vectors(self):
        store, started, release = Store(), threading.Event(), threading.Event()
        cleaned = []
        def convert(*_):
            started.set()
            release.wait(3)
        queue = FallbackQueue(store, convert, lambda *args: cleaned.append(args))
        try:
            queue.enqueue('scope', 'source', SimpleNamespace(collection='old-model'))
            self.assertTrue(started.wait(2))
            store.delete('scope', 'source', 'fallback')
        finally:
            release.set()
            queue.close()
        self.assertEqual(cleaned, [('scope', 'source')])


if __name__ == '__main__':
    unittest.main(argv=['test_fallback_queue'], verbosity=2)
