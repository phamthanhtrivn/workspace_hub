"""Stage a Gemini vector collection without changing the live local collection."""
import json
import os
import sys
import math
from concurrent.futures import ThreadPoolExecutor

from .api_embeddings import GeminiEmbeddings
from .profiling import profile


def report(**values):
    print(json.dumps(values), flush=True)


def migrate_source(engine, old_collection, source, index):
    scope, source_id = source['notebook_id'], source['id']
    source_filter = engine.scope_filter(scope, [source_id], collection=old_collection)
    points = []
    offset = None
    while True:
        page, offset = engine.client.scroll(
            old_collection, scroll_filter=source_filter,
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
    chunks = [(point.payload['text'], point.payload.get('page'), point.payload.get('imageId'))
              for point in points]
    # Reuse staged generations and the persistent vector cache, including interrupted migrations.
    with profile('embedding_migration') as timing:
        engine._index(scope, source_id, source['revision'], 'migration.txt', '', timing, chunks=chunks)
    count = engine.client.count(engine.collection,
                                count_filter=engine.scope_filter(scope, [source_id]), exact=True).count
    if count != source['chunk_count']:
        raise ValueError('Migrated source count mismatch')
    report(event='gemini_embedding_migration', source=index,
           chunks_done=len(points), total_chunks=len(points))


def main():
    from .engine import Engine

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
