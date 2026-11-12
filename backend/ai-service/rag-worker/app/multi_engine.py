"""Independent vector spaces, parallel indexing/search and rank-based fusion."""
import logging
import hashlib
import time
import httpx
from concurrent.futures import ThreadPoolExecutor

from .engine import Engine
from .policy import reciprocal_rank_many
from .profiling import profile
from .fallback_queue import FallbackQueue
from .errors import FallbackPending, quota_info
from .document_locks import document_lock, scope_lock

logger = logging.getLogger("workspace.rag")


class MultiEngine:
    def __init__(self, primary: Engine, secondary: Engine, *additional: Engine, strategy='ensemble'):
        if strategy not in ('ensemble', 'shard'):
            raise ValueError('Invalid embedding index strategy')
        self.strategy = strategy
        self.quota_until = {}
        engines = (primary, secondary, *additional)
        if len({engine.collection for engine in engines}) != len(engines):
            raise ValueError("Each embedding model requires a distinct vector collection")
        self.primary = primary
        self.engines = engines
        # Five uploads per model plus an independent query task for each model.
        self.pool = ThreadPoolExecutor(max_workers=len(engines) * 6, thread_name_prefix="embedding-model")
        self.collection = primary.collection
        self.provider = primary.provider
        self.model_name = primary.model_name
        self.model = primary.model
        self.embedding_models = [engine.model_name for engine in self.engines]
        self.embedding_collections = {engine.model_name: engine.collection for engine in self.engines}
        self.manifests = primary.manifests
        self.fallbacks = FallbackQueue(self.manifests, self.local_copy, self.delete)
        self.recovered = False

    def _run_all(self, method, *args):
        futures = [self.pool.submit(getattr(engine, method), *args) for engine in self.engines]
        results, failures = [], []
        # Wait for all models: never leave indexing/deletion running after returning failure.
        for future in futures:
            try:
                results.append(future.result())
            except Exception as error:
                failures.append(error)
        if failures:
            raise failures[0]
        return results

    def ready(self):
        tasks = [(engine, self.pool.submit(engine.ready)) for engine in self.engines
                 if not self.quota_exhausted(engine)]
        failures = []
        available = []
        for engine, task in tasks:
            try:
                task.result()
                available.append(engine)
            except Exception as error:
                if self.strategy == 'ensemble' and engine is not self.primary:
                    logger.warning('Optional embedding model unavailable model=%s error=%s',
                                   engine.model_name, type(error).__name__)
                elif self.strategy != 'shard' or not self.mark_quota(engine, error):
                    failures.append(error)
        if failures:
            raise failures[0]
        if (self.strategy == 'shard' and any(self.quota_exhausted(engine) for engine in self.engines)
                and not any(engine.provider == 'local' for engine in available)):
            raise RuntimeError('Local quota fallback is unavailable')
        if not self.recovered:
            self.fallbacks.recover(self.engines)
            self.recovered = True
        return [engine.model_name for engine in available]

    def quota_exhausted(self, engine):
        return self.quota_until.get(engine.collection, 0) > time.monotonic()

    def mark_quota(self, engine, error):
        if isinstance(error, httpx.HTTPStatusError) and error.response.status_code == 429:
            daily_quota, retry_after = quota_info(error.response)
            delay = 3600 if daily_quota else max(1, min(3600, retry_after))
            self.quota_until[engine.collection] = time.monotonic() + delay
            logger.warning('Embedding quota exhausted model=%s; local fallback required', engine.model_name)
            return True
        return False

    def local_engine(self):
        return next((engine for engine in self.engines if engine.provider == 'local'), None)

    def remember(self, scope, source, engine):
        self.manifests.put(scope, source, collection=engine.collection)

    def validate(self, *args):
        return self.primary.validate(*args)

    def extract(self, *args):
        return self.primary.extract(*args)

    def owner(self, scope_id, source_id):
        collection = self.manifests.route(scope_id, source_id, self.primary.vector_cache)
        if collection:
            for engine in self.engines:
                if engine.collection == collection:
                    return engine
            raise ValueError('Document model is unavailable; migrate before removing a model')
        return max(self.engines, key=lambda engine: hashlib.sha256(
            f'{scope_id}:{source_id}:{engine.collection}'.encode()).digest())

    def local_copy(self, scope, source, previous):
        with scope_lock(scope), document_lock(scope, source):
            return self._local_copy(scope, source, previous)

    def _local_copy(self, scope, source, previous):
        local = self.local_engine()
        if local is None:
            raise RuntimeError('No local fallback model')
        points, offset = [], None
        while True:
            batch, offset = previous.client.scroll(previous.collection,
                scroll_filter=previous.scope_filter(scope, [source]), limit=128, offset=offset, with_vectors=False)
            points.extend(batch)
            if offset is None:
                break
        if not points:
            return local
        points.sort(key=lambda point: point.payload['position'])
        revision = points[0].payload['revision']
        chunks = [(point.payload['text'], point.payload.get('page'), point.payload.get('imageId')) for point in points]
        if any(point.payload['revision'] != revision or point.payload['position'] != index
               for index, point in enumerate(points)):
            raise ValueError('Document fallback index is incomplete')
        self._index_model(local, scope, source, revision, 'fallback.txt', '', chunks)
        self.remember(scope, source, local)
        return local

    def groups(self, scope_id, source_ids):
        owners = {}
        pending = False
        if self.strategy == 'shard':
            for source in source_ids:
                owner = self.owner(scope_id, source)
                if self.quota_exhausted(owner):
                    if owner.client.collection_exists(owner.collection) and owner.client.count(owner.collection,
                            count_filter=owner.scope_filter(scope_id, [source]), exact=True).count == 0:
                        owners[source] = owner
                        continue
                    self.fallbacks.enqueue(scope_id, source, owner)
                    pending = True
                else:
                    owners[source] = owner
        if pending:
            raise FallbackPending()
        return [(engine, source_ids if self.strategy == 'ensemble' else [
            source for source in source_ids if owners[source] is engine]) for engine in self.engines]

    def chunks(self, scope_id, source_ids):
        if self.strategy == 'ensemble':
            return self.primary.chunks(scope_id, source_ids)
        tasks = [(sources, self.pool.submit(engine.chunks, scope_id, sources))
                 for engine, sources in self.groups(scope_id, source_ids) if sources]
        items, failures = {}, []
        for sources, future in tasks:
            try:
                for item in future.result()['evidence']:
                    if item['sourceId'] not in sources:
                        raise ValueError('Invalid chunk scope')
                    items[item['id']] = item
            except Exception as error:
                failures.append(error)
        if failures:
            raise failures[0]
        if len(items) > 10000:
            raise ValueError('Index exceeds source limit')
        return {'evidence': sorted(items.values(), key=lambda item: (item['sourceId'], item['position']))}

    @staticmethod
    def _complete(engine, scope_id, source_id, revision, chunks):
        if not engine.client.collection_exists(engine.collection):
            return False
        points, offset = [], None
        while True:
            batch, offset = engine.client.scroll(
                engine.collection, scroll_filter=engine.scope_filter(scope_id, [source_id]),
                limit=128, offset=offset, with_vectors=False,
            )
            points.extend(batch)
            if len(points) > len(chunks):
                return False
            if offset is None:
                break
        points.sort(key=lambda point: point.payload['position'])
        return len(points) == len(chunks) and all(
            point.payload['revision'] == revision and point.payload['position'] == index and
            (point.payload['text'], point.payload.get('page'), point.payload.get('imageId')) == chunk
            for index, (point, chunk) in enumerate(zip(points, chunks, strict=True))
        )

    @classmethod
    def _index_model(cls, engine, scope_id, source_id, revision, name, content, chunks):
        if cls._complete(engine, scope_id, source_id, revision, chunks):
            return {"chunkCount": len(chunks), 'embeddingCache': {'hits': len(chunks), 'misses': 0}}
        with profile("index_model") as timing:
            return engine._index(scope_id, source_id, revision, name, content, timing, chunks=chunks)

    def index(self, scope_id, source_id, revision, name, content, pages=None, visuals=None):
        with scope_lock(scope_id), document_lock(scope_id, source_id):
            return self._index_source(scope_id, source_id, revision, name, content, pages, visuals)

    def _index_source(self, scope_id, source_id, revision, name, content, pages=None, visuals=None):
        with profile("index_parse") as timing, self.primary.index_lock:
            chunks = self.primary._index_chunks(scope_id, name, content, timing, pages, visuals)
        if self.strategy == 'shard':
            engine = self.owner(scope_id, source_id)
            if self.quota_exhausted(engine):
                engine = self.local_engine()
                if engine is None:
                    raise RuntimeError('No local fallback model')
            try:
                result = self._index_model(engine, scope_id, source_id, revision, name, content, chunks)
            except Exception as error:
                if not self.mark_quota(engine, error) or self.local_engine() is None:
                    raise
                engine = self.local_engine()
                result = self._index_model(engine, scope_id, source_id, revision, name, content, chunks)
            self.remember(scope_id, source_id, engine)
            return {**result, 'embeddingModels': [engine.model_name]}
        futures = [self.pool.submit(self._index_model, engine, scope_id, source_id, revision, name, content, chunks)
                   for engine in self.engines]
        failures = []
        for future in futures:
            try:
                if future.result()['chunkCount'] != len(chunks):
                    raise ValueError("Incomplete model index")
            except Exception as error:
                failures.append(error)
        if failures:
            raise failures[0]
        return {"chunkCount": len(chunks), "embeddingModels": self.embedding_models}

    def _retrieve_group(self, engine, scope, sources, question):
        try:
            return engine.retrieve(scope, sources, question)
        except Exception as error:
            if self.strategy != 'shard' or not self.mark_quota(engine, error) or self.local_engine() is None:
                raise
            for source in sources:
                self.fallbacks.enqueue(scope, source, engine)
            raise FallbackPending() from None

    def retrieve(self, scope_id, source_ids, question):
        groups = [(engine, sources) for engine, sources in self.groups(scope_id, source_ids) if sources]
        futures = [self.pool.submit(self._retrieve_group, engine, scope_id, sources, question) for engine, sources in groups]
        rankings, items, failures = [], {}, []
        for (engine, sources), future in zip(groups, futures, strict=True):
            try:
                evidence = future.result()['evidence']
                if any(item['sourceId'] not in sources for item in evidence):
                    raise ValueError("Invalid retrieval scope")
                # Chunk ids differ per model (each has its own generation), so fuse on a model-independent key.
                rankings.append([(item['sourceId'], item['position']) for item in evidence])
                for item in evidence:
                    items.setdefault((item['sourceId'], item['position']), item)
            except Exception as error:
                logger.warning("Embedding search unavailable model=%s error=%s", engine.model_name, type(error).__name__)
                failures.append(error)
                rankings.append([])
        # Shards hold different documents: never silently omit a failed required shard.
        if failures and (self.strategy == 'shard' or len(failures) == len(groups)):
            raise failures[0]
        candidates = reciprocal_rank_many(rankings, limit=24)
        result, budget = [], 0
        # Each model already applied lexical reranking; chunks found by several models rank higher.
        for key in candidates:
            if len(result) >= 8:
                break
            size = len(items[key]['text'].encode())
            if budget + size <= 16000:
                result.append(items[key])
                budget += size
        return {"evidence": result}

    def delete(self, *args):
        # A source-level delete must not interleave with indexing the same source.
        source = args[1] if len(args) > 1 else None
        with scope_lock(args[0], deleting=source is None, cleanup=True), document_lock(args[0], source):
            self._run_all("delete", *args)
            self.primary.vector_cache.delete_legacy_routes(*args)
            self.manifests.delete(*args)
        return {"ok": True}

    def close(self):
        self.fallbacks.close()
        self.pool.shutdown(wait=True)
        for engine in self.engines:
            engine.close()
