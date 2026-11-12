import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { aiRequire, command, until } from './support.mjs';

// Real production image, Nest HTTP, PostgreSQL, Redis and BullMQ. User/Document,
// LLM boundaries use synthetic HTTP fixtures, never private documents. Set
// AI_TEST_RAG_IMAGE to exercise real RAG/Qdrant; default embeddings are fixtures.
test('Notebook production image: auth, indexing, SSE, summary, cancellation, backup/restore and cleanup', {
  skip: process.env.WORKSPACEHUB_AI_INTEGRATION !== '1', timeout: 240000,
}, async () => {
  const id = `wh-ai-release-${randomBytes(5).toString('hex')}`;
  const image = process.env.AI_TEST_IMAGE || 'workspacehub-ai:production-check';
  const ragImage = process.env.AI_TEST_RAG_IMAGE;
  const containers = [];
  const keys = Object.fromEntries(['gateway', 'document', 'rag', 'user', 'jwt', 'llm'].map(name => [name, randomBytes(32).toString('hex')]));
  const actors = [randomUUID(), randomUUID()];
  const documentId = randomUUID(), versionId = randomUUID();
  const content = Buffer.from('The production review release date is 12 November 2026.');
  const revision = createHash('sha256').update(content).digest('hex');
  const index = new Map();
  let revoked = false, sessionActive = true, hold = false, heldResponse, modelCalls = 0;
  let pool, restore, server, networkCreated = false;
  const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const token = actor => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: actor, sid: randomUUID(), email: `${actor}@example.test`, role: 'USER', email_verified: true, token_use: 'access', iss: 'workspace-hub', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    return `${header}.${payload}.${createHmac('sha256', keys.jwt).update(`${header}.${payload}`).digest('base64url')}`;
  };
  async function start(name, base, args = [], trailing = []) {
    const full = `${id}-${name}`;
    await command('docker', ['run', '-d', '--name', full, '--label', `workspacehub.ai-review=${id}`, '--network', id, ...args, base, ...trailing]);
    containers.push(full);
    return full;
  }
  async function port(container, number) {
    const binding = await command('docker', ['port', container, `${number}/tcp`]);
    assert.match(binding, /^127\.0\.0\.1:\d+$/);
    return Number(binding.split(':').at(-1));
  }
  async function installed(container, fallback) {
    return command('docker', ['inspect', '--format', '{{.Image}}', container]).catch(() => fallback);
  }
  try {
    await command('docker', ['network', 'create', '--label', `workspacehub.ai-review=${id}`, id]);
    networkCreated = true;
    const pg = await start('postgres', await installed('wh_postgres', 'postgres:15.18-alpine'), ['--network-alias', 'postgres', '--tmpfs', '/var/lib/postgresql/data', '-p', '127.0.0.1::5432', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=ai_release_review']);
    await until(async () => { await command('docker', ['exec', pg, 'pg_isready', '-U', 'postgres', '-d', 'ai_release_review']); return true; }, 'temporary PostgreSQL');
    const redis = await start('redis', await installed('wh_redis', 'redis:7.4.8-alpine'), ['--network-alias', 'redis', '--tmpfs', '/data'], ['redis-server', '--appendonly', 'yes', '--appendfsync', 'everysec', '--maxmemory-policy', 'noeviction']);
    await until(async () => (await command('docker', ['exec', redis, 'redis-cli', 'ping'])) === 'PONG', 'temporary Redis');
    const { Pool } = aiRequire('pg');
    const pgPort = await port(pg, 5432);
    pool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${pgPort}/ai_release_review` });
    server = createServer(async (req, res) => {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
        const path = req.url;
        if (path === '/file') { res.writeHead(200, { 'content-length': content.length }); return res.end(content); }
        if (path === '/v1/embeddings') {
          assert.equal(req.headers.authorization, `Bearer ${keys.llm}`);
          return send(res, 200, { data: body.input.map((text, position) => ({ index: position, embedding: [...createHash('sha256').update(text).digest().subarray(0, 8)].map(value => (value + 1) / 256) })) });
        }
        const expected = path.startsWith('/api/users/') ? keys.user : path.startsWith('/internal/') ? keys.document : keys.rag;
        if (path !== '/v1/chat/completions' && req.headers['x-internal-service-key'] !== expected) return send(res, 401, {});
        if (path === '/api/users/internal/sessions/authorize') return send(res, 200, { active: sessionActive });
        if (path === '/internal/notebook-documents/resolve') {
          if (!body.refs) return send(res, 400, {});
          if (revoked) return send(res, 403, {});
          return send(res, 200, { data: body.refs.map(() => ({ documentId, versionId, revision, name: 'release.txt', sizeBytes: content.length, current: true, downloadUrl: `${fixtureUrl}/file` })) });
        }
        if (path === '/ready') return send(res, 200, { status: 'ok' });
        if (path === '/validate') return send(res, 200, { chunkCount: 1 });
        if (path === '/index') {
          index.set(`${body.scopeId}:${body.sourceId}`, { id: randomUUID(), sourceId: body.sourceId, position: 0, text: content.toString() });
          return send(res, 200, { chunkCount: 1 });
        }
        if (path === '/retrieve' || path === '/chunks') return send(res, 200, { evidence: body.sourceIds.flatMap(source => index.get(`${body.scopeId}:${source}`) || []) });
        if (path === '/delete') {
          for (const key of index.keys()) if (body.sourceId ? key === `${body.scopeId}:${body.sourceId}` : key.startsWith(`${body.scopeId}:`)) index.delete(key);
          return send(res, 200, { ok: true });
        }
        if (path === '/v1/chat/completions') {
          assert.equal(req.headers.authorization, `Bearer ${keys.llm}`);
          modelCalls++;
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          if (hold) { heldResponse = res; return; }
          const prefix = body.messages[0].content.includes('Always begin with exactly one') ? '[[ANSWER]]' : '';
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `${prefix}The release date is 12 November 2026. [[S1]]` }, finish_reason: null }] })}\n\n`);
          return res.end(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`);
        }
        send(res, 404, {});
      } catch { if (!res.headersSent) send(res, 500, {}); else res.end(); }
    });
    await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
    const fixtureUrl = `http://host.docker.internal:${server.address().port}`;
    let ragUrl = fixtureUrl, qdrantUrl;
    if (ragImage) {
      const qdrant = await start('qdrant', 'qdrant/qdrant:v1.19.2', ['--network-alias', 'qdrant', '--tmpfs', '/qdrant/storage', '-p', '127.0.0.1::6333']);
      qdrantUrl = `http://127.0.0.1:${await port(qdrant, 6333)}`;
      const local = process.env.AI_TEST_MODEL_VOLUME;
      const modelMount = local ? ['--mount', `type=volume,source=${local},target=/models,readonly`, '-e', 'HF_HUB_OFFLINE=1'] : [];
      await start('rag', ragImage, ['--network-alias', 'rag', '--add-host', 'host.docker.internal:host-gateway', '--memory', '2g', ...modelMount,
        '-e', `RAG_SERVICE_KEY=${keys.rag}`, '-e', 'QDRANT_URL=http://qdrant:6333',
        '-e', `EMBEDDING_PROVIDER=${local ? 'local' : 'api'}`, '-e', `EMBEDDING_BASE_URL=${fixtureUrl}/v1`, '-e', `EMBEDDING_API_KEY=${keys.llm}`,
        '-e', 'EMBEDDING_MODEL=intfloat/multilingual-e5-small', '-e', 'EMBEDDING_CACHE_PATH=/tmp/embedding-cache.sqlite3', '-e', 'OMP_NUM_THREADS=2']);
      ragUrl = 'http://rag:8088';
    }
    const env = {
      NODE_ENV: 'production', BIND_HOST: '0.0.0.0', PORT: '8087', AI_ENABLED: 'true',
      DATABASE_URL: 'postgres://postgres@postgres:5432/ai_release_review', REDIS_URL: 'redis://redis:6379/0',
      AI_GATEWAY_KEY: keys.gateway, AI_DOCUMENT_SERVICE_KEY: keys.document, RAG_SERVICE_KEY: keys.rag,
      AI_TO_USER_KEY: keys.user, JWT_SECRET_KEY: keys.jwt, JWT_ISSUER: 'workspace-hub', USER_SERVICE_URL: fixtureUrl,
      DOCUMENT_SERVICE_URL: fixtureUrl, RAG_WORKER_URL: ragUrl, FRONTEND_URL: 'https://review.example',
      LLM_BASE_URL: `${fixtureUrl}/v1`, LLM_API_KEY: keys.llm, LLM_MODEL: 'release-review',
      LLM_MAX_TOKENS: '256', LLM_REQUESTS_PER_MINUTE: '1000', LLM_TOKENS_PER_MINUTE: '1000000', LLM_REQUESTS_PER_DAY: '10000',
      CONVERSATION_AI_ENABLED: 'false', WORK_ASSISTANT_ENABLED: 'false', MEETING_SUMMARY_ENABLED: 'false', VOICE_TRANSCRIPTION_ENABLED: 'false', VISUAL_ENABLED: 'false',
      CHAT_CANCEL_POLL_MS: '500', AI_SHUTDOWN_TIMEOUT_MS: '10000',
    };
    const envArgs = Object.entries(env).flatMap(([name, value]) => ['-e', `${name}=${value}`]);
    const common = ['--add-host', 'host.docker.internal:host-gateway', ...envArgs];
    const api = await start('api', image, ['-p', '127.0.0.1::8087', ...common]);
    const base = `http://127.0.0.1:${await port(api, 8087)}`;
    async function request(path, { method = 'GET', body, actor = actors[0], proof = true } = {}) {
      const response = await fetch(`${base}${path}`, { method, headers: {
        'content-type': 'application/json', authorization: `Bearer ${token(actor)}`,
        'x-user-id': actor, 'x-user-email': `${actor}@example.test`, ...(proof ? { 'x-workspace-gateway-key': keys.gateway } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      return { status: response.status, data };
    }
    await until(async () => (await request('/health')).status === 200, 'production API starts');
    assert.equal((await request('/ready')).status, 503, 'unmigrated schema is never ready');
    await pool.query(`CREATE SCHEMA notebook_ai;
      CREATE TABLE notebook_ai.schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
      CREATE FUNCTION notebook_ai.reject_review_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.name LIKE '005_%' THEN RAISE EXCEPTION 'Injected history failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_review_history BEFORE INSERT ON notebook_ai.schema_migrations FOR EACH ROW EXECUTE FUNCTION notebook_ai.reject_review_history();`);
    const migrate = () => command('docker', ['run', '--rm', '--network', id, ...common, image, 'node', 'dist/migrate.js']);
    await assert.rejects(migrate(), /failed/);
    assert.equal((await pool.query("SELECT to_regclass('notebook_ai.notebooks') AS table")).rows[0].table, null, 'history failure rolled back DDL');
    await pool.query('DROP TRIGGER reject_review_history ON notebook_ai.schema_migrations; DROP FUNCTION notebook_ai.reject_review_history()');
    await Promise.all([migrate(), migrate()]);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM notebook_ai.schema_migrations')).rows[0].count, 10);
    const jobs = await start('jobs', image, common, ['node', 'dist/worker.js']);
    await until(async () => (await request('/ready')).status === 200, 'migrated API and worker heartbeat', 90000);
    assert.equal((await request('/api/ai/notebooks', { proof: false })).status, 401);
    const created = await request('/api/ai/notebooks', { method: 'POST', body: { title: 'Synthetic release review' } });
    assert.equal(created.status, 201);
    const notebook = created.data.data.id;
    assert.equal((await request(`/api/ai/notebooks/${notebook}`, { actor: actors[1] })).status, 404);
    const added = await request(`/api/ai/notebooks/${notebook}/sources`, { method: 'POST', body: { refs: [{ documentId }] } });
    assert.equal(added.status, 201);
    const source = added.data.data[0].id;
    await until(async () => (await pool.query('SELECT status FROM notebook_ai.sources WHERE id=$1', [source])).rows[0]?.status === 'READY', 'BullMQ indexes source');
    const message = body => request(`/api/ai/notebooks/${notebook}/messages`, { method: 'POST', body });
    const answered = await message({ question: 'What is the release date?', sourceIds: [source], requestId: randomUUID() });
    assert.match(answered.data, /event: done/);
    assert.match(answered.data, /12 November 2026/);
    const summary = await request(`/api/ai/notebooks/${notebook}/artifacts`, { method: 'POST', body: { kind: 'SUMMARY', sourceIds: [source] } });
    assert.equal(summary.status, 201);
    await until(async () => (await pool.query('SELECT status FROM notebook_ai.artifacts WHERE id=$1', [summary.data.data.id])).rows[0]?.status === 'COMPLETED', 'summary worker checkpoints and completes');
    assert.equal(modelCalls, 2);
    hold = true;
    const requestId = randomUUID();
    const interrupted = message({ question: 'Which date is the release scheduled for?', sourceIds: [source], requestId });
    await until(() => Boolean(heldResponse), 'model request held');
    assert.equal((await request(`/api/ai/requests/${requestId}/cancel`, { method: 'POST', body: {} })).status, 201);
    await until(async () => (await pool.query('SELECT status FROM notebook_ai.requests WHERE id=$1', [requestId])).rows[0]?.status === 'CANCELLED', 'server cancellation persisted');
    hold = false; heldResponse.end();
    assert.match((await interrupted).data, /event: error/);
    assert.match((await message({ question: 'What is the release date?', sourceIds: [source], requestId: randomUUID() })).data, /event: done/);
    revoked = true;
    const hidden = (await request(`/api/ai/notebooks/${notebook}`)).data.data;
    assert.ok(hidden.messages.filter(item => item.role === 'ASSISTANT').every(item => item.hidden && item.content === ''));
    revoked = false; sessionActive = false;
    assert.equal((await request('/api/ai/notebooks')).status, 401);
    sessionActive = true;
    const dump = execFileSync('docker', ['exec', pg, 'pg_dump', '-U', 'postgres', '-d', 'ai_release_review', '--no-owner', '--no-privileges'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, windowsHide: true });
    await command('docker', ['exec', pg, 'createdb', '-U', 'postgres', 'ai_restore_review']);
    execFileSync('docker', ['exec', '-i', pg, 'psql', '-U', 'postgres', '-d', 'ai_restore_review', '-v', 'ON_ERROR_STOP=1', '-q'], { input: dump, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    restore = new Pool({ connectionString: `postgres://postgres@127.0.0.1:${pgPort}/ai_restore_review` });
    assert.equal((await restore.query('SELECT count(*)::int AS count FROM notebook_ai.notebooks')).rows[0].count, 1);
    assert.equal((await restore.query("SELECT count(*)::int AS count FROM notebook_ai.artifacts WHERE status='COMPLETED'")).rows[0].count, 1);
    const redisKeys = await command('docker', ['exec', redis, 'redis-cli', 'DBSIZE']);
    await command('docker', ['exec', redis, 'redis-cli', 'SAVE']);
    const redisDump = execFileSync('docker', ['exec', redis, 'cat', '/data/dump.rdb'], { windowsHide: true });
    const redisRestore = await start('redis-restore', await installed('wh_redis', 'redis:7.4.8-alpine'), ['--tmpfs', '/data'], ['sh', '-c', 'sleep 600']);
    execFileSync('docker', ['exec', '-i', redisRestore, 'sh', '-c', 'cat > /tmp/dump.rdb'], { input: redisDump, windowsHide: true });
    await command('docker', ['exec', redisRestore, 'redis-server', '--dir', '/tmp', '--dbfilename', 'dump.rdb', '--appendonly', 'no', '--daemonize', 'yes']);
    assert.equal(await command('docker', ['exec', redisRestore, 'redis-cli', 'DBSIZE']), redisKeys, 'queue snapshot restored');
    if (ragImage) {
      await command('docker', ['run', '--rm', '--network', id, '--entrypoint', 'python', ragImage, '-c', `
from qdrant_client import QdrantClient
client = QdrantClient(url='http://qdrant:6333', timeout=30)
for collection in client.get_collections().collections:
    assert collection.name.startswith('wh_notebook_')
    snapshot = client.create_snapshot(collection.name)
    assert snapshot and snapshot.size > 0
    restored = collection.name + '_review_restore'
    client.recover_snapshot(restored, location=f'file:///qdrant/snapshots/{collection.name}/{snapshot.name}', checksum=getattr(snapshot, 'checksum', None), priority='snapshot')
    expected = client.count(collection.name, exact=True).count
    assert expected > 0 and client.count(restored, exact=True).count == expected
    client.delete_collection(restored)
client.close()
print('Qdrant snapshots restored and point counts verified')
`]);
    }
    assert.equal((await request(`/api/ai/notebooks/${notebook}`, { method: 'DELETE' })).status, 200);
    await until(async () => index.size === 0 && (await pool.query('SELECT count(*)::int AS count FROM notebook_ai.cleanup_outbox')).rows[0].count === 0, 'durable cleanup outbox drained', 45000);
    if (qdrantUrl) {
      const collections = await (await fetch(`${qdrantUrl}/collections`)).json();
      for (const collection of collections.result.collections) {
        const response = await fetch(`${qdrantUrl}/collections/${collection.name}/points/count`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ exact: true, filter: { must: [{ key: 'scopeId', match: { value: notebook } }] } }) });
        const result = await response.json();
        assert.equal(result.result.count, 0, `no orphaned Qdrant data in ${collection.name}`);
      }
    }
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM notebook_ai.sources')).rows[0].count, 0);
    const stopped = await command('docker', ['stop', '--time', '20', api, jobs]);
    assert.ok(stopped.includes(api));
    for (const container of [api, jobs]) assert.equal(await command('docker', ['inspect', '--format', '{{.State.ExitCode}}', container]), '0', 'SIGTERM exits cleanly');
    assert.match(await command('docker', ['run', '--rm', '--network', 'none', image, 'ffmpeg', '-version']), /ffmpeg version/);
  } finally {
    heldResponse?.end();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await Promise.allSettled([pool?.end(), restore?.end()]);
    for (const container of containers.reverse()) await command('docker', ['rm', '-f', container]).catch(() => {});
    if (networkCreated) await command('docker', ['network', 'rm', id]).catch(() => {});
  }
});
