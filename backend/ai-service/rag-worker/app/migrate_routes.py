"""Copy legacy SQLite document routes into Qdrant after verifying stored chunks."""
import hashlib
import json
import os
import sys
from qdrant_client import QdrantClient, models
from .manifests import ManifestStore
from .vector_cache import VectorCache


def migrate(data):
    client = QdrantClient(url=os.environ['QDRANT_URL'], api_key=os.environ.get('QDRANT_API_KEY') or None)
    store = ManifestStore(client)
    cache = VectorCache(os.environ.get('EMBEDDING_CACHE_PATH', '/models/embedding-cache.sqlite3'))
    try:
        for source in data['sources']:
            scope, identity = source['notebook_id'], source['id']
            route = store.get(scope, identity)
            collection = route['collection'] if route else cache.route(scope, identity)
            collection = collection or max(data['collections'].values(), key=lambda name:
                hashlib.sha256(f'{scope}:{identity}:{name}'.encode()).digest())
            conditions = [models.FieldCondition(key='scopeId', match=models.MatchValue(value=scope)),
                          models.FieldCondition(key='sourceId', match=models.MatchValue(value=identity))]
            manifest = store.get(scope, identity, collection)
            conditions.append(models.FieldCondition(key='generation', match=models.MatchValue(value=manifest['generation']))
                              if manifest else models.IsEmptyCondition(is_empty=models.PayloadField(key='generation')))
            points, offset = [], None
            while True:
                batch, offset = client.scroll(collection, scroll_filter=models.Filter(must=conditions),
                                              limit=128, offset=offset, with_vectors=False)
                points.extend(batch)
                if offset is None:
                    break
            points.sort(key=lambda point: point.payload['position'])
            if len(points) != source['chunk_count'] or any(point.payload['revision'] != source['revision']
                    or point.payload['position'] != index for index, point in enumerate(points)):
                raise ValueError('Stored document snapshot does not match its route')
            store.put(scope, identity, collection=collection)
        print(json.dumps({'migratedRoutes': len(data['sources'])}))
    finally:
        cache.close()
        client.close()


if __name__ == '__main__':
    migrate(json.load(sys.stdin))
