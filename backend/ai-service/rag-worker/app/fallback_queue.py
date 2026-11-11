"""Bounded local conversion queue with durable recovery metadata."""
import logging
import threading
from concurrent.futures import ThreadPoolExecutor

from qdrant_client import models

from .errors import FallbackPending


class FallbackQueue:
    def __init__(self, manifests, convert, cleanup):
        self.manifests = manifests
        self.convert = convert
        self.cleanup = cleanup
        self.pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix='local-fallback')
        self.lock = threading.Lock()
        self.pending = {}

    def enqueue(self, scope, source, previous):
        key = (scope, source)
        with self.lock:
            task = self.pending.get(key)
            if task and not task.done():
                return
            # At most five source conversions can be admitted per request; bound total backlog too.
            self.pending = {key: task for key, task in self.pending.items() if not task.done()}
            if len(self.pending) >= 20:
                raise FallbackPending()
            self.manifests.put(scope, source, 'fallback', previous=previous.collection, status='QUEUED')
            self.pending[key] = self.pool.submit(self.run, scope, source, previous)

    def run(self, scope, source, previous):
        try:
            state = self.manifests.get(scope, source, 'fallback')
            if not state:
                return
            self.manifests.put(scope, source, 'fallback', previous=previous.collection, status='RUNNING')
            self.convert(scope, source, previous)
            if not self.manifests.get(scope, source, 'fallback'):
                self.cleanup(scope, source)
                return
            self.manifests.delete(scope, source, 'fallback')
        except Exception as error:
            logging.getLogger('workspace.rag').warning('Local fallback failed error=%s', type(error).__name__)
            self.manifests.put(scope, source, 'fallback', previous=previous.collection, status='FAILED')

    def recover(self, engines):
        if not self.manifests.client.collection_exists(self.manifests.collection):
            return
        points, _ = self.manifests.client.scroll(self.manifests.collection, limit=20, with_vectors=False,
            scroll_filter=models.Filter(must=[
                models.FieldCondition(key='namespace', match=models.MatchValue(value='fallback')),
                models.FieldCondition(key='status', match=models.MatchAny(any=['QUEUED', 'RUNNING'])),
            ]))
        for point in points:
            data = point.payload
            previous = next((engine for engine in engines if engine.collection == data['previous']), None)
            if previous:
                self.enqueue(data['scopeId'], data['sourceId'], previous)

    def close(self):
        self.pool.shutdown(wait=True)
