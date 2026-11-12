import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import { createRequire, Module } from 'node:module';

const url = process.env.AI_MIGRATION_TEST_URL;
test('real PostgreSQL rolls back schema/history together and releases locks for concurrent migrators', { skip: !url }, async () => {
  const target = new URL(url);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname));
  assert.equal(target.pathname, '/ai_migration_review', 'only an isolated test database is allowed');
  const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
  tooling('ts-node').register({ transpileOnly: true, skipProject: true,
    compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023' } });
  const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, max: 2 });
  const observer = new Pool({ connectionString: url, max: 1 });
  let failHistory = true;
  const id = require.resolve('./src/infrastructure/database/database.ts');
  const entry = new Module(id);
  entry.filename = id; entry.loaded = true;
  entry.exports = { db: { connect: async () => {
    const client = await pool.connect();
    return { query: async (sql, args) => {
      if (failHistory && sql.includes('INSERT INTO notebook_ai.schema_migrations') && args[0].startsWith('005_'))
        throw new Error('Injected history failure');
      return client.query(sql, args);
    }, release: error => client.release(error) };
  } } };
  require.cache[id] = entry;
  const { migrate } = require('./src/migrate.ts');
  const files = readdirSync(new URL('../ai-service/api/migrations/', import.meta.url)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  try {
    assert.equal((await observer.query("SELECT to_regnamespace('notebook_ai') AS schema")).rows[0].schema, null);
    await assert.rejects(migrate(), /Injected history failure/);
    assert.equal((await observer.query("SELECT to_regnamespace('notebook_ai') AS schema")).rows[0].schema, null, 'DDL and ledger rolled back');
    failHistory = false;
    await Promise.all([migrate(), migrate()]);
    assert.deepEqual((await observer.query('SELECT name FROM notebook_ai.schema_migrations ORDER BY name')).rows.map(row => row.name), files);
    assert.equal((await observer.query('SELECT pg_try_advisory_lock(8087099) AS unlocked')).rows[0].unlocked, true);
    await observer.query('SELECT pg_advisory_unlock(8087099)');
    const columns = (await observer.query("SELECT column_name FROM information_schema.columns WHERE table_schema='notebook_ai' AND ((table_name='artifacts' AND column_name='run_id') OR (table_name='requests' AND column_name='artifact_id')) ORDER BY column_name")).rows;
    assert.deepEqual(columns.map(row => row.column_name), ['artifact_id', 'run_id']);
    await migrate();
    assert.equal((await observer.query('SELECT count(*)::int AS count FROM notebook_ai.schema_migrations')).rows[0].count, files.length);
  } finally {
    await Promise.all([pool.end(), observer.end()]);
  }
});
