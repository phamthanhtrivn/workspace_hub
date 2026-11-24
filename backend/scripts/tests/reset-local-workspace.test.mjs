import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertApplicationsStopped } from '../reset-local-workspace.mjs';

test('idle IDE connections block reset and report an actionable safe reason', async () => {
  const plan = { services: { communication: { database: 'communication_db' } } };
  const client = { query: async () => ({ rowCount: 1, rows: [{ datname: 'communication_db', application_name: 'DBeaver 26.2.0 - Metadata', count: 2 }] }) };
  await assert.rejects(assertApplicationsStopped(plan, client), error => {
    assert.equal(error.resetFailure?.code, 'ACTIVE_DATABASE_CONNECTIONS');
    assert.deepEqual(error.resetFailure.databases, [{ database: 'communication_db', connections: 2, client: 'DBeaver' }]);
    assert.match(error.resetFailure.message, /Disconnect.*DBeaver/);
    return true;
  });
});

test('reset preflight permits an empty application connection list', async () => {
  const client = { query: async () => ({ rowCount: 0, rows: [] }) };
  await assert.doesNotReject(assertApplicationsStopped({ services: {} }, client));
});
