import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { json, until } from './support.mjs';
import { account } from './user-auth.mjs';
import { registerConsumerTests } from './kafka-consumer.mjs';
import { registerOutboxTests } from './outbox-leases.mjs';

export function registerAsyncTests(state) {
  test('registration and its event roll back together when the outbox insert fails', async () => {
    const email = `${randomUUID()}@security.example.test`;
    const before = await state.userDb.query('SELECT count(*)::int AS count FROM users');
    await state.userDb.query(`CREATE FUNCTION security_test_reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Security test rejects outbox insert'; END $$;
      CREATE TRIGGER security_test_reject_outbox BEFORE INSERT ON user_event_outbox FOR EACH ROW EXECUTE FUNCTION security_test_reject_outbox()`);
    try {
      const result = await json(state.infrastructure.userUrl, '/api/auth/register', { method: 'POST', body: { email, fullName: 'Rollback test', password: 'RollbackTest42!Only' } });
      assert.equal(result.status, 500);
      assert.equal((await state.userDb.query('SELECT count(*)::int AS count FROM users WHERE email=$1', [email])).rows[0].count, 0);
      assert.equal((await state.userDb.query('SELECT count(*)::int AS count FROM users')).rows[0].count, before.rows[0].count);
      assert.equal((await state.userDb.query("SELECT count(*)::int AS count FROM user_event_outbox WHERE payload->>'email'=$1", [email])).rows[0].count, 0);
    } finally { await state.userDb.query('DROP TRIGGER security_test_reject_outbox ON user_event_outbox; DROP FUNCTION security_test_reject_outbox()'); }
  });

  test('User outbox retains committed events through a real broker outage and recovers after acknowledgement', { timeout: 180000 }, async () => {
    const infrastructure = state.infrastructure;
    await until(async () => (await state.userDb.query('SELECT count(*)::int AS pending FROM user_event_outbox WHERE delivered_at IS NULL')).rows[0].pending === 0,
      'User outbox has caught up before broker fault', 60000);
    await infrastructure.admin.disconnect();
    await infrastructure.control('stop', 'kafka');
    let user;
    try {
      user = await account(state, { verify: false });
      await until(async () => {
        const rows = await state.userDb.query('SELECT delivered_at, attempt_count FROM user_event_outbox WHERE aggregate_id=$1', [user.id]);
        return rows.rows.some((row) => row.delivered_at === null && row.attempt_count > 0);
      // Kafka send() may wait up to its metadata max.block.ms before the
      // relay's Future.get timeout starts. Observe a real failed attempt.
      }, 'failed broker delivery remains pending in User outbox', 90000);
    } finally {
      await infrastructure.control('start', 'kafka');
      await until(async () => { await infrastructure.admin.connect(); await infrastructure.admin.listTopics(); return true; }, 'test broker recovery', 60000);
    }
    await until(async () => {
      const rows = await state.userDb.query('SELECT delivered_at FROM user_event_outbox WHERE aggregate_id=$1', [user.id]);
      return rows.rowCount && rows.rows.every((row) => row.delivered_at !== null);
    }, 'User event delivery after broker recovery', 45000);
  });
  registerOutboxTests(state);
  registerConsumerTests(state);
}
