"""Durable document routes and active generations, backed up with Qdrant data."""
import threading
from uuid import NAMESPACE_URL, uuid5

from qdrant_client import models
from .document_locks import document_lock


def document_filter(manifests, collection, scope_id, source_ids=None, active=True):
    conditions = [models.FieldCondition(key='scopeId', match=models.MatchValue(value=scope_id))]
    if source_ids:
        conditions.append(models.FieldCondition(key='sourceId', match=models.MatchAny(any=source_ids)))
        if active and manifests is not None:
            versions = []
            for source in source_ids:
                manifest = manifests.get(scope_id, source, collection)
                generation = (
                    models.FieldCondition(key='generation', match=models.MatchValue(value=manifest['generation']))
                    if manifest else models.IsEmptyCondition(is_empty=models.PayloadField(key='generation'))
                )
                versions.append(models.Filter(must=[
                    models.FieldCondition(key='sourceId', match=models.MatchValue(value=source)), generation,
                ]))
            conditions.append(models.Filter(should=versions))
    return models.Filter(must=conditions)


class ManifestStore:
    collection = 'wh_notebook_manifests_v1'
    creation_lock = threading.Lock()

    def __init__(self, client):
        self.client = client

    @staticmethod
    def identity(scope, source, namespace='route'):
        return str(uuid5(NAMESPACE_URL, f'notebook-manifest:{scope}:{source}:{namespace}'))

    def get(self, scope, source, namespace='route'):
        if not self.client.collection_exists(self.collection):
            return None
        records = self.client.retrieve(self.collection, ids=[self.identity(scope, source, namespace)], with_vectors=False)
        return records[0].payload if records else None

    def route(self, scope, source, legacy_cache):
        with document_lock(scope, source):
            route = self.get(scope, source)
            if route:
                return route['collection']
            # Promote old routes under the same lock as indexing and deletion.
            collection = legacy_cache.legacy_route(scope, source)
            if collection:
                self.put(scope, source, collection=collection)
            return collection

    def put(self, scope, source, namespace='route', **payload):
        with self.creation_lock:
            if not self.client.collection_exists(self.collection):
                self.client.create_collection(self.collection,
                    vectors_config=models.VectorParams(size=1, distance=models.Distance.DOT))
                self.client.create_payload_index(self.collection, 'scopeId', models.PayloadSchemaType.KEYWORD)
                self.client.create_payload_index(self.collection, 'sourceId', models.PayloadSchemaType.KEYWORD)
        self.client.upsert(self.collection, points=[models.PointStruct(
            id=self.identity(scope, source, namespace), vector=[1.0],
            payload={'scopeId': scope, 'sourceId': source, 'namespace': namespace, **payload})], wait=True)

    def delete(self, scope, source=None, namespace=None):
        if not self.client.collection_exists(self.collection):
            return
        conditions = [models.FieldCondition(key='scopeId', match=models.MatchValue(value=scope))]
        if source:
            conditions.append(models.FieldCondition(key='sourceId', match=models.MatchValue(value=source)))
        if namespace:
            conditions.append(models.FieldCondition(key='namespace', match=models.MatchValue(value=namespace)))
        self.client.delete(self.collection, points_selector=models.FilterSelector(
            filter=models.Filter(must=conditions)), wait=True)
