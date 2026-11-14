import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
  IsolatedInfrastructure,
  aiRequire,
  command,
  root,
} from '../support.mjs';

/** Deliberately does not call the legacy all-service migrate() or read private env files. */
export class MeetingInfrastructure extends IsolatedInfrastructure {
  async prepare() {
    this.scratch = await mkdtemp(join(tmpdir(), 'wh-meeting-audit-'));
    await this.start();
    const label = await command('docker', [
      'inspect',
      '--format',
      '{{index .Config.Labels "workspacehub.security-test"}}',
      `${this.id}-postgres`,
    ]);
    assert.equal(label, this.id);
    const admin = new (aiRequire('pg').Client)(this.pgConfig());
    await admin.connect();
    try {
      for (const service of ['communication', 'ai']) {
        const name = this.dbName(service);
        assert.match(name, /^wh_security_test_[a-z]+$/);
        await admin.query(`CREATE DATABASE "${name}"`);
      }
    } finally {
      await admin.end();
    }
    const url = new URL(this.dbUrl('communication'));
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(Number(url.port), this.pgPort);
    assert.equal(url.pathname, `/${this.dbName('communication')}`);
    // production disables .env.local's override:true; supplied DATABASE_URL also wins over .env.
    await command(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      {
        cwd: resolve(root, 'backend/communication-service'),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          DATABASE_URL: url.toString(),
        },
      },
    );
    const { applyFullMigrations } =
      await import('../../../backend/scripts/local-security/full-migrations.mjs');
    await applyFullMigrations(
      { admin: this.pgConfig() },
      'ai',
      this.dbName('ai'),
    );
    const db = await this.db('communication');
    const identity = await db.query('SELECT current_database() AS name');
    assert.equal(identity.rows[0].name, this.dbName('communication'));
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM meetings')).rows[0].n,
      0,
    );
    assert.ok(
      (
        await db.query(
          "SELECT to_regclass('public.voice_transcript_requests') AS table_name",
        )
      ).rows[0].table_name,
    );
  }

  async dispose() {
    const failures = [];
    try {
      await this.close();
    } catch (error) {
      failures.push(error);
    }
    if (this.scratch) {
      const directory = resolve(this.scratch);
      assert.ok(directory.startsWith(resolve(tmpdir()) + sep));
      assert.ok(directory.split(sep).at(-1).startsWith('wh-meeting-audit-'));
      try {
        await rm(directory, { recursive: true, force: true });
      } catch (error) {
        failures.push(error);
      }
    }
    const remaining = await command('docker', [
      'ps',
      '-a',
      '--filter',
      `label=workspacehub.security-test=${this.id}`,
      '--format',
      '{{.Names}}',
    ]);
    assert.equal(
      remaining,
      '',
      'all run-labelled test containers were removed',
    );
    const networks = await command('docker', [
      'network',
      'ls',
      '--filter',
      `label=workspacehub.security-test=${this.id}`,
      '--format',
      '{{.Name}}',
    ]);
    assert.equal(networks, '', 'the isolated test network was removed');
    if (failures.length)
      throw new AggregateError(failures, 'Meeting test cleanup failed');
    console.log(
      '# Meeting audit cleanup verified: no test containers, network or scratch directory remain.',
    );
  }
}
