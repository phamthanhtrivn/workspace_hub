import json
import base64
import math
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from app.api_embeddings import ApiEmbeddings, GeminiEmbeddings
from app.engine import Engine
from app.multi_engine import MultiEngine as DualEngine
from app.errors import InvalidSource
from app.profiling import Profile


def vector():
    return [3.0, 4.0] + [0.0] * 766


class EmbeddingTests(unittest.TestCase):
    def test_gemini_batch_order_tasks_dimensions_and_normalization(self):
        requests = []
        def handler(request):
            self.assertEqual(request.headers['x-goog-api-key'], 'synthetic-test-key')
            body = json.loads(request.content)
            requests.append(body)
            return httpx.Response(200, json={'embeddings': [{'values': vector()} for _ in body['requests']]})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            engine = GeminiEmbeddings('synthetic-test-key', client=client)
            result = engine.embed(['first text', 'second text'])
            engine.embed(['query'], query=True)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][:2], [0.6, 0.8])
        self.assertAlmostEqual(math.hypot(*result[0]), 1)
        self.assertEqual(requests[0]['requests'][1]['content']['parts'][0]['text'], 'second text')
        self.assertEqual(requests[0]['requests'][0]['taskType'], 'RETRIEVAL_DOCUMENT')
        self.assertEqual(requests[1]['requests'][0]['taskType'], 'RETRIEVAL_QUERY')
        self.assertEqual(requests[0]['requests'][0]['outputDimensionality'], 768)

    def test_five_document_requests_run_together_without_blocking_queries(self):
        started = threading.Event()
        release = threading.Event()
        lock = threading.Lock()
        active = 0
        peak = 0
        def handler(request):
            nonlocal active, peak
            body = json.loads(request.content)
            if body['requests'][0]['taskType'] == 'RETRIEVAL_DOCUMENT':
                with lock:
                    active += 1
                    peak = max(peak, active)
                    if active == 5:
                        started.set()
                if not release.wait(5):
                    raise RuntimeError('documents were not released')
                with lock:
                    active -= 1
            return httpx.Response(200, json={'embeddings': [{'values': vector()}]})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            engine = GeminiEmbeddings('synthetic-test-key', client=client)
            with ThreadPoolExecutor(max_workers=6) as pool:
                tasks = [pool.submit(engine.embed, [f'document {i}']) for i in range(5)]
                try:
                    self.assertTrue(started.wait(5))
                    self.assertEqual(len(pool.submit(engine.embed, ['query'], True).result(timeout=3)[0]), 768)
                finally:
                    release.set()
                self.assertTrue(all(len(task.result(timeout=3)[0]) == 768 for task in tasks))
        self.assertEqual(peak, 5)

    def test_rejects_invalid_vectors_and_indices(self):
        invalid = [
            {'data': []},
            {'data': [{'index': 0, 'embedding': [0, 0]}]},
            {'data': [{'index': 0, 'embedding': [float('nan'), 1]}]},
            {'data': [{'index': 0, 'embedding': [True, 1]}]},
            {'data': [{'index': 1, 'embedding': [1, 2]}]},
            {'data': [{'index': False, 'embedding': [1, 2]}]},
            {'model': 'wrong-model', 'data': [{'index': 0, 'embedding': [1, 2]}]},
        ]
        with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200))) as client:
            engine = ApiEmbeddings('https://embedding.invalid/v1', 'test', 'test-model', client=client)
            for body in invalid:
                with self.subTest(body=body), self.assertRaises(ValueError):
                    engine.validate_response(body, ['one'])
            with self.assertRaises(ValueError):
                engine.validate_response({'data': [{'index': 0, 'embedding': [1, 2]}, {'index': 0, 'embedding': [2, 1]}]}, ['one', 'two'])
            engine.validate_response({'data': [{'index': 0, 'embedding': [1, 2]}]}, ['one'])
            with self.assertRaises(ValueError):
                engine.validate_response({'data': [{'index': 0, 'embedding': [1, 2, 3]}]}, ['one'])

    def test_quota_rejection_waits_but_unknown_outcomes_and_other_http_errors_do_not_replay(self):
        statuses = [429, 200]
        def handler(_):
            status = statuses.pop(0)
            return httpx.Response(status, headers={'retry-after': '2'}, json={'embeddings': [{'values': vector()}]})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client, patch('app.api_embeddings.time.sleep') as wait:
            GeminiEmbeddings('test', client=client).embed(['synthetic'])
            wait.assert_called_once_with(2)
        for outcome in [400, 401, 403, 500, 503, 'connect-error']:
            calls = []
            def fail(request):
                calls.append(request)
                if outcome == 'connect-error':
                    raise httpx.ConnectError('synthetic interruption')
                return httpx.Response(outcome)
            with httpx.Client(transport=httpx.MockTransport(fail)) as client:
                with self.assertRaises(httpx.HTTPError):
                    GeminiEmbeddings('test', client=client).embed(['synthetic'])
            self.assertEqual(len(calls), 1)

    def test_quota_retries_are_bounded(self):
        calls = []
        def fail(request):
            calls.append(request)
            return httpx.Response(429)
        with httpx.Client(transport=httpx.MockTransport(fail)) as client, patch('app.api_embeddings.time.sleep'):
            with self.assertRaises(httpx.HTTPStatusError):
                GeminiEmbeddings('test', client=client).embed(['synthetic'])
        self.assertEqual(len(calls), 3)

    def test_daily_quota_rejection_does_not_wait_or_replay(self):
        calls = []
        def fail(request):
            calls.append(request)
            return httpx.Response(429, json={'error': {'details': [{'violations': [
                {'quotaId': 'EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier'}]}]}})
        with httpx.Client(transport=httpx.MockTransport(fail)) as client, patch('app.api_embeddings.time.sleep') as wait:
            with self.assertRaises(httpx.HTTPStatusError):
                GeminiEmbeddings('test', client=client).embed(['synthetic'])
            wait.assert_not_called()
        self.assertEqual(len(calls), 1)

    def test_query_quota_failure_does_not_wait_or_replay(self):
        calls = []
        def handler(request):
            calls.append(request)
            return httpx.Response(429)
        with httpx.Client(transport=httpx.MockTransport(handler)) as client, patch('app.api_embeddings.time.sleep') as wait:
            with self.assertRaises(httpx.HTTPStatusError):
                GeminiEmbeddings('test', client=client).embed(['query'], query=True)
            wait.assert_not_called()
        self.assertEqual(len(calls), 1)

    def test_document_engine_releases_parse_lock_and_creates_collection_once(self):
        engine = Engine.__new__(Engine)
        engine.api_embeddings = object()
        engine.index_lock = threading.Lock()
        engine.collection_lock = threading.Lock()
        engine.collection = 'synthetic-test-collection'
        engine.prepare = lambda _scope, _name, content, _timing: [(content, 1)]
        barrier = threading.Barrier(5)
        def embed(texts):
            barrier.wait(timeout=5)
            return [[1.0, 2.0] for _ in texts]
        engine.embed = embed
        created = []
        saved = []
        def create(*_args, **_kwargs):
            time.sleep(0.01)
            created.append(True)
        engine.client = SimpleNamespace(
            collection_exists=lambda _: bool(created), create_collection=create,
            create_payload_index=lambda *_a, **_k: None,
            delete=lambda *_a, **_k: None,
            upsert=lambda _collection, points, **_k: saved.extend(points),
        )
        with ThreadPoolExecutor(max_workers=5) as pool:
            tasks = [pool.submit(engine.index, 'scope', f'source-{i}', 'revision', 'test.txt', f'document {i}') for i in range(5)]
            self.assertTrue(all(task.result(timeout=8)['chunkCount'] == 1 for task in tasks))
        self.assertEqual(len(created), 1)
        self.assertEqual({item.payload['sourceId'] for item in saved}, {f'source-{i}' for i in range(5)})
        self.assertTrue(all(item.payload['scopeId'] == 'scope' for item in saved))

    def test_invalid_endpoint_and_missing_credentials_are_rejected(self):
        for endpoint in ['http://untrusted.invalid', 'https://user:password@example.test', 'https://api.test?secret=key', '']:
            with self.assertRaises(ValueError):
                ApiEmbeddings(endpoint, 'test', 'model')
        with self.assertRaises(ValueError):
            GeminiEmbeddings('')
        with self.assertRaises(ValueError):
            GeminiEmbeddings('test', model='gemini-embedding-002')

    def test_embedding_two_keeps_chunks_separate_and_uses_prefixes_without_task_type(self):
        requests = []
        def handler(request):
            body = json.loads(request.content)
            requests.append(body)
            self.assertTrue(str(request.url).endswith('gemini-embedding-2:batchEmbedContents'))
            return httpx.Response(200, json={'embeddings': [{'values': vector()} for _ in body['requests']]})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            engine = GeminiEmbeddings('test', model='gemini-embedding-2', client=client)
            self.assertEqual(len(engine.embed(['first', 'second'])), 2)
            engine.embed(['question'], query=True)
        self.assertEqual(requests[0]['requests'][0]['content']['parts'][0]['text'], 'title: none | text: first')
        self.assertEqual(requests[0]['requests'][1]['content']['parts'][0]['text'], 'title: none | text: second')
        self.assertEqual(requests[1]['requests'][0]['content']['parts'][0]['text'], 'task: search result | query: question')
        self.assertTrue(all('taskType' not in item for body in requests for item in body['requests']))


class SourceTokenLimitTests(unittest.TestCase):
    def engine(self, count):
        engine = Engine.__new__(Engine)
        engine.tokenizer = lambda _: range(count)
        engine.splitter = SimpleNamespace(split_text=lambda text: [text])
        engine.index_lock = threading.Lock()
        engine.api_embeddings = None
        return engine

    def test_text_and_pdf_accept_through_100k_and_reject_the_next_token(self):
        for count in (40001, 100000, 100001):
            for name in ('test.txt', 'test.pdf'):
                engine = self.engine(count)
                pdf = SimpleNamespace(is_encrypted=False, pages=[SimpleNamespace(extract_text=lambda: 'synthetic')])
                with self.subTest(tokens=count, file=name), patch('pypdf.PdfReader', return_value=pdf):
                    if count <= 100000:
                        self.assertEqual(engine.parse(name, b'synthetic')[0][0], 'synthetic')
                    else:
                        with self.assertRaises(InvalidSource) as failure:
                            engine.parse(name, b'synthetic')
                        self.assertEqual(failure.exception.code, 'SOURCE_TOKEN_LIMIT')

    def test_enriched_text_uses_the_same_100k_limit(self):
        for count in (40001, 100000, 100001):
            engine = self.engine(count)
            args = ('scope', 'test.docx', '', Profile('test'), [{'text': 'synthetic', 'page': 1}], [])
            with self.subTest(tokens=count):
                if count <= 100000:
                    self.assertEqual(len(engine._index_chunks(*args)), 1)
                else:
                    with self.assertRaises(InvalidSource) as failure:
                        engine._index_chunks(*args)
                    self.assertEqual(failure.exception.code, 'SOURCE_TOKEN_LIMIT')

    def test_extracted_visual_text_uses_the_same_100k_limit(self):
        result = {'pages': [{'text': 'synthetic', 'page': 1}], 'images': []}
        for count in (40001, 100000, 100001):
            engine = self.engine(count)
            with self.subTest(tokens=count), patch('app.engine.visual_enabled', return_value=True), patch('app.engine.VisualExtractor') as extractor:
                extractor.return_value.extract.return_value = result
                if count <= 100000:
                    self.assertEqual(engine.extract('test.pdf', base64.b64encode(b'test').decode()), result)
                else:
                    with self.assertRaises(InvalidSource) as failure:
                        engine.extract('test.pdf', base64.b64encode(b'test').decode())
                    self.assertEqual(failure.exception.code, 'SOURCE_TOKEN_LIMIT')


class FakeEngine:
    def __init__(self, name, evidence=None, fail=False):
        self.model_name = self.collection = name
        self.model = None
        self.provider = 'gemini'
        self.index_lock = threading.Lock()
        self.client = SimpleNamespace(collection_exists=lambda _: False)
        self.evidence = evidence or []
        self.fail = fail
        self.calls = []
        self.parses = 0
        self.barrier = None

    def retrieve(self, scope, sources, question):
        if self.barrier:
            self.barrier.wait(timeout=5)
        if self.fail:
            raise RuntimeError('synthetic failure')
        return {'evidence': self.evidence}

    def _index_chunks(self, scope, name, content, timing, pages, visuals):
        self.parses += 1
        return [(content, 1, None)]

    def _index(self, scope, source, revision, name, content, timing, chunks):
        if self.barrier:
            self.barrier.wait(timeout=5)
        self.calls.append((scope, source, chunks))
        if self.fail:
            raise RuntimeError('synthetic failure')
        return {'chunkCount': len(chunks)}

    def scope_filter(self, *args):
        return args

    def chunks(self, *args):
        return {'evidence': self.evidence}

    def delete(self, *args):
        self.calls.append(args)
        if self.fail:
            raise RuntimeError('synthetic failure')
        return {'ok': True}

    def close(self):
        pass


class DualTests(unittest.TestCase):
    def test_quota_readiness_and_deleted_source(self):
        primary, secondary, local = FakeEngine('one'), FakeEngine('two'), FakeEngine('local')
        local.provider = 'local'
        group = DualEngine(primary, secondary, local, strategy='shard')
        response = httpx.Response(429, request=httpx.Request('POST', 'https://example.test'))
        error = httpx.HTTPStatusError('quota', request=response.request, response=response)
        def unavailable():
            raise error
        primary.ready = secondary.ready = unavailable
        local.ready = lambda: None
        primary.client.scroll = lambda *_a, **_k: ([], None)
        secondary.client.scroll = primary.client.scroll
        try:
            group.ready()
            group.ready()
            self.assertEqual(group.chunks('scope', ['deleted'])['evidence'], [])
        finally:
            group.close()

    def test_shard_quota_falls_back_to_local_but_other_failures_do_not(self):
        primary, secondary, local = FakeEngine('one'), FakeEngine('two'), FakeEngine('local')
        local.provider = 'local'
        group = DualEngine(primary, secondary, local, strategy='shard')
        source = next(str(i) for i in range(100) if group.owner('scope', str(i)) is primary)
        response = httpx.Response(429, request=httpx.Request('POST', 'https://example.test'))
        try:
            with patch.object(primary, '_index', side_effect=httpx.HTTPStatusError('quota', request=response.request, response=response)):
                result = group.index('scope', source, 'revision', 'file.txt', 'document')
            self.assertEqual(result['embeddingModels'], ['local'])
            self.assertTrue(group.quota_exhausted(primary))
            result = group.index('scope', source, 'revision', 'file.txt', 'document')
            self.assertEqual(result['embeddingModels'], ['local'])
            group.quota_until.clear()
            with patch.object(primary, '_index', side_effect=RuntimeError('unknown outcome')):
                with self.assertRaises(RuntimeError):
                    group.index('scope', source, 'revision', 'file.txt', 'document')
            self.assertEqual(len(local.calls), 2)
        finally:
            group.close()

    def test_shards_index_once_and_search_all_document_groups(self):
        engines = [FakeEngine('one'), FakeEngine('two'), FakeEngine('local')]
        group = DualEngine(*engines, strategy='shard')
        try:
            sources = [f'source-{i}' for i in range(30)]
            for source in sources:
                owner = group.owner('scope', source)
                owner.evidence.append(self.item(source, source))
                result = group.index('scope', source, 'revision', 'file.txt', 'document')
                self.assertEqual(result['embeddingModels'], [owner.model_name])
            self.assertEqual(sum(len(engine.calls) for engine in engines), 30)
            self.assertTrue(all(engine.calls for engine in engines))
            self.assertEqual(len(group.chunks('scope', sources)['evidence']), 30)
            self.assertTrue(group.retrieve('scope', sources, 'question')['evidence'])
            engines[0].fail = True
            with self.assertRaises(RuntimeError):
                group.retrieve('scope', sources, 'question')
        finally:
            group.close()

    def test_shard_assignment_stable_when_model_order_changes(self):
        engines = [FakeEngine('one'), FakeEngine('two'), FakeEngine('local')]
        first = DualEngine(*engines, strategy='shard')
        second = DualEngine(*reversed(engines), strategy='shard')
        try:
            for i in range(30):
                self.assertIs(first.owner('scope', str(i)), second.owner('scope', str(i)))
        finally:
            first.close()
            second.close()

    def item(self, key, source='source'):
        return {'id': key, 'sourceId': source, 'text': 'synthetic text '+key, 'position': 0}

    def test_three_models_index_five_documents_concurrently(self):
        engines = [FakeEngine('gemini-one'), FakeEngine('gemini-two'), FakeEngine('local')]
        engines[2].provider = 'local'
        barrier = threading.Barrier(15)
        for engine in engines:
            engine.barrier = barrier
        group = DualEngine(*engines)
        try:
            with ThreadPoolExecutor(max_workers=5) as pool:
                tasks = [pool.submit(group.index, 'scope', f'source-{i}', 'revision', 'file.txt', f'doc {i}') for i in range(5)]
                self.assertTrue(all(task.result(timeout=8)['chunkCount'] == 1 for task in tasks))
            self.assertEqual(group.embedding_models, ['gemini-one', 'gemini-two', 'local'])
            self.assertTrue(all(len(engine.calls) == 5 for engine in engines))
            group.delete('scope')
            self.assertTrue(all(engine.calls[-1] == ('scope',) for engine in engines))
        finally:
            group.close()

    def test_three_model_fusion_and_local_only_fallback(self):
        engines = [FakeEngine('one', [self.item('a')]), FakeEngine('two', [self.item('b')]),
                   FakeEngine('local', [self.item('a'), self.item('c')])]
        group = DualEngine(*engines)
        try:
            result = group.retrieve('scope', ['source'], 'synthetic')['evidence']
            self.assertEqual([item['id'] for item in result], ['a', 'b', 'c'])
            engines[0].fail = engines[1].fail = True
            self.assertEqual([item['id'] for item in group.retrieve('scope', ['source'], 'synthetic')['evidence']], ['a', 'c'])
        finally:
            group.close()

    def test_search_runs_both_models_and_fuses_unique_results(self):
        first = FakeEngine('one', [self.item('a'), self.item('b')])
        second = FakeEngine('two', [self.item('b'), self.item('c')])
        first.barrier = second.barrier = threading.Barrier(2)
        engine = DualEngine(first, second)
        try:
            result = engine.retrieve('scope', ['source'], 'synthetic')['evidence']
            self.assertEqual({item['id'] for item in result}, {'a', 'b', 'c'})
            self.assertEqual(len(result), 3)
            self.assertEqual(result[0]['id'], 'b')
        finally:
            engine.close()

    def test_one_model_failure_keeps_other_results_both_failures_raise(self):
        first, second = FakeEngine('one', [self.item('a')]), FakeEngine('two', fail=True)
        engine = DualEngine(first, second)
        try:
            self.assertEqual(len(engine.retrieve('scope', ['source'], 'q')['evidence']), 1)
            first.fail = True
            with self.assertRaises(RuntimeError):
                engine.retrieve('scope', ['source'], 'q')
        finally:
            engine.close()

    def test_out_of_scope_hits_are_never_merged(self):
        engine = DualEngine(FakeEngine('one', [self.item('safe')]), FakeEngine('two', [self.item('unsafe', 'other-source')]))
        try:
            self.assertEqual([item['id'] for item in engine.retrieve('scope', ['source'], 'q')['evidence']], ['safe'])
        finally:
            engine.close()

    def test_five_documents_index_on_both_models_while_parsing_each_only_once(self):
        first, second = FakeEngine('one'), FakeEngine('two')
        first.barrier = second.barrier = threading.Barrier(10)
        engine = DualEngine(first, second)
        try:
            with ThreadPoolExecutor(max_workers=5) as pool:
                tasks = [pool.submit(engine.index, 'scope', f'source-{i}', 'revision', 'test.txt', f'document {i}') for i in range(5)]
                self.assertTrue(all(task.result(timeout=8)['chunkCount'] == 1 for task in tasks))
            self.assertEqual(first.parses, 5)
            self.assertEqual(second.parses, 0)
            self.assertEqual(len(first.calls), 5)
            self.assertEqual(len(second.calls), 5)
        finally:
            engine.close()

    def test_complete_model_is_not_billed_again_when_retrying_missing_model(self):
        first, second = FakeEngine('one'), FakeEngine('two')
        first.client = SimpleNamespace(collection_exists=lambda _: True, scroll=lambda *_a, **_k: (
            [SimpleNamespace(payload={'position': 0, 'revision': 'revision', 'text': 'document', 'page': 1})], None))
        engine = DualEngine(first, second)
        try:
            engine.index('scope', 'source', 'revision', 'test.txt', 'document')
            self.assertEqual(first.calls, [])
            self.assertEqual(len(second.calls), 1)
            self.assertEqual(engine.chunks('scope', ['source']), {'evidence': []})
        finally:
            engine.close()

    def test_failed_index_waits_for_sibling_and_delete_covers_both_collections(self):
        first, second = FakeEngine('one', fail=True), FakeEngine('two')
        engine = DualEngine(first, second)
        try:
            with self.assertRaises(RuntimeError):
                engine.index('scope', 'source', 'revision', 'file.txt', 'document')
            self.assertEqual(len(second.calls), 1)
            first.fail = False
            engine.delete('scope', 'source')
            self.assertEqual(first.calls[-1], ('scope', 'source'))
            self.assertEqual(second.calls[-1], ('scope', 'source'))
        finally:
            engine.close()


if __name__ == '__main__':
    unittest.main(argv=['test_api_embeddings'], verbosity=2)
