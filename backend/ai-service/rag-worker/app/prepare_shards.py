"""Validate existing shard ownership and seed cache without calling embedding models."""
import hashlib
import json
import os
import sys

from qdrant_client import QdrantClient
from .manifests import ManifestStore, document_filter
from .vector_cache import VectorCache


def prepare(data):
    collections = list(data['collections'].values())
    client = QdrantClient(url=os.environ['QDRANT_URL'], api_key=os.environ.get('QDRANT_API_KEY') or None)
    cache = VectorCache(os.environ.get('EMBEDDING_CACHE_PATH', '/models/embedding-cache.sqlite3'))
    store = ManifestStore(client)
    total = 0
    try:
        for source in data['sources']:
            scope, source_id = str(source['notebook_id']), str(source['id'])
            collection = max(collections, key=lambda name: hashlib.sha256(f'{scope}:{source_id}:{name}'.encode()).digest())
            if not client.collection_exists(collection):
                raise ValueError('Assigned model collection is missing; keep ensemble strategy')
            points, offset = [], None
            filter_ = document_filter(store, collection, scope, [source_id])
            while True:
                batch, offset = client.scroll(collection, scroll_filter=filter_,
                                              limit=128, offset=offset, with_vectors=True)
                points.extend(batch)
                if offset is None:
                    break
            points.sort(key=lambda point: point.payload['position'])
            if len(points) != source['chunk_count'] or any(
                point.payload.get('revision') != source['revision'] or point.payload['position'] != position
                for position, point in enumerate(points)
            ):
                raise ValueError('Assigned document index is incomplete; keep ensemble strategy')
            cache.put(scope, collection, [(point.payload['text'], point.vector) for point in points])
            total += len(points)
        return {'verifiedSources': len(data['sources']), 'cachedChunks': total}
    finally:
        cache.close()
        client.close()


if __name__ == '__main__':
    print(json.dumps(prepare(json.load(sys.stdin))))
