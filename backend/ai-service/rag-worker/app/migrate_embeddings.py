"""Stage a Gemini vector collection without changing the live local collection."""
import json
import os
import sys
import math
from concurrent.futures import ThreadPoolExecutor

from qdrant_client import models

from .api_embeddings import GeminiEmbeddings
from .engine import Engine


def report(**values):
    print(json.dumps(values), flush=True)


def migrate_source(engine, old_collection, source, index):
    points = []
    offset = None
    while True:
        page, offset = engine.client.scroll(
            old_collection, scroll_filter=engine.scope_filter(source['notebook_id'], [source['id']]),
            limit=128, offset=offset, with_vectors=False,
        )
        points.extend(page)
        if len(points) > 2000:
            raise ValueError('Source exceeds migration limit')
        if offset is None:
            break
    points.sort(key=lambda point: point.payload['position'])
    if len(points) != source['chunk_count'] or any(
        point.payload['revision'] != source['revision'] or point.payload['position'] != i
        for i, point in enumerate(points)
    ):
        raise ValueError('Indexed source snapshot changed')
    for start in range(0, len(points), 16):
        batch = points[start:start + 16]
        existing = {str(point.id): point for point in engine.client.retrieve(
            engine.collection, ids=[point.id for point in batch], with_payload=True, with_vectors=False,
        )}
        missing = [point for point in batch if str(point.id) not in existing or existing[str(point.id)].payload != point.payload]
        if missing:
            vectors = engine.embed([point.payload['text'] for point in missing])
            engine.client.upsert(engine.collection, points=[
                models.PointStruct(id=point.id, vector=vector, payload=point.payload)
                for point, vector in zip(missing, vectors, strict=True)
            ], wait=True)
        report(event='gemini_embedding_migration', source=index,
               chunks_done=min(start + 16, len(points)), total_chunks=len(points))
    count = engine.client.count(engine.collection,
                                count_filter=engine.scope_filter(source['notebook_id'], [source['id']]), exact=True).count
    if count != source['chunk_count']:
        raise ValueError('Migrated source count mismatch')


def main():
    payload = json.load(sys.stdin)
    key = payload['api_key']
    target_model = payload.get('target_model', 'gemini-embedding-001')
    local = target_model == 'intfloat/multilingual-e5-small'
    if payload.get('probe'):
        client = Engine(model_name=target_model, provider='local') if local else GeminiEmbeddings(key, model=target_model)
        try:
            vectors = client.embed(['Synthetic document one.', 'Synthetic document two.'])
            query = client.embed(['Synthetic retrieval query.'], query=True)
            report(event='gemini_native_probe', model=target_model, vectors=len(vectors), dimensions=len(query[0]),
                   normalized=all(abs(math.hypot(*item) - 1) < 1e-6 for item in [*vectors, *query]))
        finally:
            client.close()
        return
    os.environ.update(EMBEDDING_PROVIDER='local' if local else 'gemini', EMBEDDING_MODEL=target_model,
                      EMBEDDING_API_KEY=key, EMBEDDING_DIMENSIONS='768', EMBEDDING_MAX_CONCURRENCY='5')
    engine = Engine(provider='local' if local else None)
    try:
        if payload['old_collection'] == engine.collection:
            raise ValueError('Migration requires a separate vector collection')
        engine.ready()
        dimensions = len(engine.embed(['Synthetic vector dimension probe.'])[0]) if local else 768
        with engine.collection_lock:
            engine._ensure_collection(dimensions)
        with ThreadPoolExecutor(max_workers=5) as pool:
            tasks = [pool.submit(migrate_source, engine, payload['old_collection'], source, index + 1)
                     for index, source in enumerate(payload['sources'])]
            for task in tasks:
                task.result()
        report(event='gemini_embedding_migration_complete', model=target_model, collection=engine.collection,
               sources=len(payload['sources']), chunks=sum(source['chunk_count'] for source in payload['sources']))
    finally:
        engine.close()
        engine.client.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        report(event='gemini_embedding_migration_failed', error_type=type(error).__name__,
               http_status=getattr(getattr(error, 'response', None), 'status_code', None))
        sys.exit(1)
