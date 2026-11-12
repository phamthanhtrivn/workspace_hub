import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', experimentalDecorators: true } });
const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
function stub(file, exports) {
  const id = require.resolve(file), entry = new Module(id);
  entry.filename = id; entry.loaded = true; entry.exports = exports;
  require.cache[id] = entry;
}
let missing, statements, queueCalls, dependencyCalls;
stub('./src/config/env.config.ts', { config: { AI_ENABLED: 'true' } });
stub('./src/infrastructure/database/database.ts', { db: { query: async sql => {
  statements.push(sql);
  if (missing && sql.includes(missing)) throw new Error('Schema not migrated');
  return { rows: [] };
} } });
const queue = { getJobCounts: async () => { queueCalls++; }, client: Promise.resolve({ get: async () => 'ready' }) };
stub('./src/infrastructure/queue/notebook.queue.ts', { queue, summaryQueue: queue, WORKER_HEARTBEAT_VALUE: 'ready' });
stub('./src/common/health/http-dependencies.ts', { checkHttpDependencies: async () => { dependencyCalls++; return { notebook: true }; } });
stub('./src/common/errors/error-log.ts', { logError: () => {} });
const { HealthController } = require('./src/common/health/health.controller.ts');
function reset() { missing = undefined; statements = []; queueCalls = 0; dependencyCalls = 0; }

for (const field of ['notebooks', 'artifact_id', 'run_id', 'cleanup_outbox']) {
  test(`readiness rejects missing ${field} before checking workers or HTTP dependencies`, async () => {
    reset(); missing = field;
    await assert.rejects(new HealthController().ready(), error => error.getResponse().code === 'AI_DATABASE_UNAVAILABLE');
    assert.equal(queueCalls, 0);
    assert.equal(dependencyCalls, 0);
  });
}

test('readiness succeeds with schema 009/010 and healthy workers/dependencies', async () => {
  reset();
  const result = await new HealthController().ready();
  assert.equal(result.status, 'ok');
  assert.equal(dependencyCalls, 1);
  for (const name of ['notebooks', 'artifact_id', 'run_id', 'cleanup_outbox'])
    assert.ok(statements.some(sql => sql.includes(name)));
});
