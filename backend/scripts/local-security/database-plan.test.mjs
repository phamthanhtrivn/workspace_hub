import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DATABASE_PLAN_PATH, loadDatabasePlan } from './database-plan.mjs';
import { REPOSITORY_ROOT } from './env-files.mjs';

function fixture(run) {
  const temporaryRoot = resolve(REPOSITORY_ROOT, '.tmp');
  mkdirSync(temporaryRoot, { recursive: true });
  const root = mkdtempSync(resolve(temporaryRoot, 'database-plan-test-'));
  const write = (relativePath, value) => {
    const file = resolve(root, relativePath);
    mkdirSync(dirname(file), { recursive: true });
    const content = JSON.stringify(value, null, 2) + '\n';
    writeFileSync(file, content);
    return { file, content };
  };
  try { run({ root, write }); }
  finally {
    assert.equal(dirname(root), temporaryRoot);
    rmSync(root, { recursive: true, force: true });
  }
}
const plan = (database) => ({ version: 1, admin: { host: '127.0.0.1', database, password: 'fixture-only' }, services: {} });

test('database tools read the current private plan without rewriting credentials', () => {
  fixture(({ root, write }) => {
    const expected = plan('current');
    const current = write(DATABASE_PLAN_PATH, expected);
    write('backend/.env.security-db-plan.json', plan('legacy'));
    assert.deepEqual(loadDatabasePlan(root), expected);
    assert.equal(readFileSync(current.file, 'utf8'), current.content);
  });
});
test('an existing legacy private plan is read without generating a replacement', () => {
  fixture(({ root, write }) => {
    const expected = plan('legacy');
    const legacy = write('backend/.env.security-db-plan.json', expected);
    assert.deepEqual(loadDatabasePlan(root), expected);
    assert.equal(readFileSync(legacy.file, 'utf8'), legacy.content);
    assert.equal(existsSync(resolve(root, DATABASE_PLAN_PATH)), false);
  });
});
