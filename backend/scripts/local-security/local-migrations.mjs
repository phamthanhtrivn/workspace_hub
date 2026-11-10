import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, openSync, closeSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { connect, identifier } from './database-plan.mjs';
import { REPOSITORY_ROOT } from './env-files.mjs';

export const LOCAL_SECURITY_MIGRATIONS = {
  user: ['backend/user-service/src/main/resources/db/migration/V5__session_authorization_index.sql', 'backend/user-service/src/main/resources/db/migration/V6__transactional_user_event_outbox.sql'],
  project: ['backend/project-service/database/migrations/V26__user_event_delivery.sql', 'backend/project-service/database/migrations/V27__task_outbox_leases.sql'],
  communication: ['backend/communication-service/prisma/migrations/20261105000100_user_event_delivery/migration.sql'],
  document: ['backend/document-service/prisma/migrations/20261105000100_user_event_delivery/migration.sql'],
  calendar: ['backend/calendar-service/prisma/migrations/20261105000100_user_event_delivery/migration.sql'],
  notification: [],
  ai: ['001_notebooks.sql', '002_meeting_summaries.sql', '003_work_assistant.sql', '004_work_assistant_conversations.sql', '005_ai_performance.sql', '008_work_assistant_contexts.sql'].map((name) => 'backend/ai-service/api/migrations/' + name),
};

async function dockerTransfer(args, { input, output } = {}) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: [input ?? 'ignore', output ?? 'ignore', 'pipe'] });
    // pg tools can print connection details. Never forward their raw output.
    child.stderr.resume();
    child.on('error', () => reject(new Error('Local database backup/restore command failed.')));
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error('Local database backup/restore command failed.')));
  });
}

async function migrateDatabase(plan, serviceName, database) {
  const client = await connect({ ...plan.admin, database });
  const history = serviceName === 'user' || serviceName === 'project' ? 'workspacehub_schema_history' : 'workspacehub_local_security_history';
  try {
    await client.query('SELECT pg_advisory_lock(82463001)');
    await client.query(`CREATE TABLE IF NOT EXISTS ${history}(filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    for (const file of LOCAL_SECURITY_MIGRATIONS[serviceName]) {
      const source = readFileSync(resolve(REPOSITORY_ROOT, file), 'utf8');
      const checksum = createHash('sha256').update(source).digest('hex');
      const filename = serviceName === 'user' || serviceName === 'project' ? file.split('/').at(-1) : file;
      const existing = await client.query(`SELECT checksum FROM ${history} WHERE filename=$1`, [filename]);
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`${serviceName}: applied security migration checksum differs.`);
        continue;
      }
      // Some committed AI files carry their own transaction wrapper; others
      // contain only DDL. Normalize only a complete, verified outer wrapper.
      let sql = source;
      if (serviceName === 'ai') {
        const lines = source.trim().split(/\r?\n/);
        if (lines[0] === 'BEGIN;' && lines.at(-1) === 'COMMIT;') sql = lines.slice(1, -1).join('\n');
        else if (lines.some((line) => /^(?:BEGIN|COMMIT);$/.test(line.trim()))) throw new Error('Unexpected AI migration transaction wrapper.');
      }
      await client.query('BEGIN');
      try {
        await client.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'");
        await client.query(sql);
        await client.query(`INSERT INTO ${history}(filename,checksum) VALUES($1,$2)`, [filename, checksum]);
        await client.query('COMMIT');
      } catch (error) {
        error.safeContext = `${serviceName}: ${file}, line ${sql.slice(0, Math.max(0, Number(error.position ?? 1) - 1)).split('\n').length}`;
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      }
    }
  } finally { await client.end(); }
}

export async function applyLocalSecurityMigrations(plan) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirectory = resolve(REPOSITORY_ROOT, '.tmp/security-db-backups', stamp);
  mkdirSync(backupDirectory, { recursive: true });
  const admin = await connect(plan.admin);
  try {
    const superuser = await admin.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user');
    if (!superuser.rows[0]?.rolsuper) throw new Error('Expected local migration administrator.');
    for (const [name, service] of Object.entries(plan.services)) {
      const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [service.database]);
      const scratch = `wh_security_verify_${name}_${randomBytes(5).toString('hex')}`;
      if (!scratch.startsWith('wh_security_verify_') || scratch === service.database) throw new Error('Unsafe temporary database name.');
      let dump;
      if (existing.rowCount) {
        dump = resolve(backupDirectory, service.database + '.dump');
        const output = openSync(dump, 'wx', 0o600);
        try { await dockerTransfer(['exec', '-u', 'postgres', 'wh_postgres', 'pg_dump', '-U', plan.admin.user, '-d', service.database, '-Fc', '--no-owner', '--no-acl'], { output }); }
        finally { closeSync(output); }
      } else if (service.database !== 'notebook_db') throw new Error(`${name}: expected local database is absent.`);
      await admin.query(`CREATE DATABASE ${identifier(scratch)}`);
      try {
        if (dump) {
          const input = openSync(dump, 'r');
          try { await dockerTransfer(['exec', '-i', '-u', 'postgres', 'wh_postgres', 'pg_restore', '-U', plan.admin.user, '-d', scratch, '--no-owner', '--no-acl', '--exit-on-error'], { input }); }
          finally { closeSync(input); }
        }
        await migrateDatabase(plan, name, scratch);
      } finally {
        // Only the uniquely named verification database created above is removed.
        await admin.query(`DROP DATABASE ${identifier(scratch)}`);
      }
      console.log(JSON.stringify({ service: name, backup: Boolean(dump), restoredUpgradeVerified: true }));
    }
    // Every upgrade has succeeded on a restored copy before any live migration.
    for (const [name, service] of Object.entries(plan.services)) {
      const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [service.database]);
      if (!exists.rowCount) await admin.query(`CREATE DATABASE ${identifier(service.database)}`);
      await migrateDatabase(plan, name, service.database);
    }
    return { backupDirectory, services: Object.keys(plan.services), historicalBaselinesAdopted: false };
  } finally { await admin.end(); }
}
