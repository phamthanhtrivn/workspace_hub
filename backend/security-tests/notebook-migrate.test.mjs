import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import { createRequire, Module } from 'node:module';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true } });
const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
function stub(file, exports) {
  const id = require.resolve(file), entry = new Module(id);
  entry.filename = id; entry.loaded = true; entry.exports = exports;
  require.cache[id] = entry;
}

let applied = [], statements = [], released = [], pending = [], committed = [], staged = [], failOn;
const client = {
  async query(sql, args) {
    statements.push(String(sql));
    if (/SELECT name FROM notebook_ai.schema_migrations/.test(sql)) return { rows: applied.map(name => ({ name })) };
    if (failOn && String(sql).includes(failOn)) throw new Error('boom');
    if (sql === 'BEGIN') { pending = []; staged = []; }
    else if (sql === 'COMMIT') { applied.push(...pending); committed.push(...staged); pending = []; staged = []; }
    else if (sql === 'ROLLBACK') { pending = []; staged = []; }
    else {
      staged.push(sql);
      if (/INSERT INTO notebook_ai.schema_migrations/.test(sql)) pending.push(args[0]);
    }
    return { rows: [] };
  },
  release(error) { released.push(error); },
};
stub('./src/infrastructure/database/database.ts', { db: { connect: async () => client, end: async () => {} } });
const { migrate } = require('./src/migrate.ts');
const files = readdirSync(new URL('../ai-service/api/migrations/', import.meta.url)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();

function reset() { applied = []; statements = []; released = []; pending = []; committed = []; staged = []; failOn = undefined; }

test('every migration file is applied once, in order, and recorded', async () => {
  reset();
  await migrate();
  assert.deepEqual(applied, files);
  assert.equal(released.length, 1); assert.equal(released[0], undefined);
  assert.ok(statements.some(sql => /pg_advisory_xact_lock/.test(sql)), 'migration lock is transaction scoped');
  assert.equal(statements[0], 'BEGIN');
  assert.ok(statements[1].includes('SET LOCAL statement_timeout'), 'timeout override is transaction scoped');
  assert.equal(statements.at(-1), 'COMMIT');
  assert.equal(statements.filter(sql => /^BEGIN\s*;?\s*$/i.test(sql)).length, 1);
  assert.equal(statements.filter(sql => /^\s*BEGIN;|COMMIT;\s*$/i.test(sql)).length, 0, 'file wrappers cannot commit independently');
});

test('already recorded migrations are skipped on the next run', async () => {
  reset(); applied = [...files];
  await migrate();
  assert.equal(statements.filter(sql => /INSERT INTO notebook_ai.schema_migrations/.test(sql)).length, 0);
  assert.ok(!statements.some(sql => /CREATE TABLE IF NOT EXISTS notebook_ai\.meeting_summaries/.test(sql)));
});

test('a failing migration stops the run, is not recorded and discards the connection', async () => {
  reset(); failOn = 'meeting_summaries';
  const quiet = console.error; console.error = () => {};
  try { await assert.rejects(migrate(), /boom/); } finally { console.error = quiet; }
  assert.ok(!applied.includes(files.find(name => name.startsWith('002_'))));
  assert.ok(!applied.includes(files.find(name => name.startsWith('003_'))));
  assert.equal(released.length, 1); assert.ok(released[0] instanceof Error);
  assert.equal(statements.at(-1), 'ROLLBACK');
  assert.deepEqual(applied, [], 'earlier migrations roll back too');
});

test('history write failure rolls back schema changes and allows a clean retry', async () => {
  reset(); failOn = 'INSERT INTO notebook_ai.schema_migrations';
  const quiet = console.error; console.error = () => {};
  try { await assert.rejects(migrate(), /boom/); } finally { console.error = quiet; }
  assert.deepEqual(applied, []);
  assert.deepEqual(committed, []);
  assert.equal(statements.at(-1), 'ROLLBACK');
  failOn = undefined;
  await migrate();
  assert.deepEqual(applied, files);
});

test('commit failure discards the connection without reporting migrations applied', async () => {
  reset(); failOn = 'COMMIT';
  await assert.rejects(migrate(), /boom/);
  assert.deepEqual(applied, []);
  assert.equal(statements.at(-1), 'ROLLBACK');
  assert.ok(released[0] instanceof Error);
});
