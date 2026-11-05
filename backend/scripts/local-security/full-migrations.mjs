import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { connect } from './database-plan.mjs';
import { REPOSITORY_ROOT, readEnvironment } from './env-files.mjs';

const sqlDirectories = {
  user: 'backend/user-service/src/main/resources/db/migration',
  project: 'backend/project-service/database/migrations',
  ai: 'backend/ai-service/api/migrations',
};
const prismaServices = new Set(['communication', 'document', 'calendar', 'notification']);

function migrationFiles(service) {
  const directory = resolve(REPOSITORY_ROOT, sqlDirectories[service]);
  const names = readdirSync(directory).filter((name) => service === 'ai' ? /^\d+_.*\.sql$/.test(name) : /^V\d+__.*\.sql$/.test(name));
  names.sort((a, b) => {
    const first = Number((service === 'ai' ? /^\d+/ : /^V\d+/).exec(a)[0].replace('V', ''));
    const second = Number((service === 'ai' ? /^\d+/ : /^V\d+/).exec(b)[0].replace('V', ''));
    return first - second || a.localeCompare(b, 'en');
  });
  return names.map((name) => ({ name, path: resolve(directory, name) }));
}

async function applySql(plan, service, database) {
  const db = await connect({ ...plan.admin, database });
  try {
    await db.query('CREATE TABLE workspacehub_schema_history(filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const { name, path } of migrationFiles(service)) {
      const source = readFileSync(path, 'utf8');
      const checksum = createHash('sha256').update(source).digest('hex');
      // psql tolerates a UTF-8 BOM at the start of some committed SQL files;
      // the pg driver does not. Keep the checksum over the original bytes.
      let sql = source.replace(/^\uFEFF/, '');
      if (service === 'ai') {
        const lines = sql.trim().split(/\r?\n/);
        if (lines[0] === 'BEGIN;' && lines.at(-1) === 'COMMIT;') sql = lines.slice(1, -1).join('\n');
        else if (lines.some((line) => /^(?:BEGIN|COMMIT);$/.test(line.trim()))) throw new Error('Unexpected AI migration wrapper.');
      }
      await db.query('BEGIN');
      try {
        await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='90s'");
        await db.query(sql);
        await db.query('INSERT INTO workspacehub_schema_history(filename,checksum) VALUES($1,$2)', [name, checksum]);
        await db.query('COMMIT');
      } catch (error) {
        await db.query('ROLLBACK').catch(() => {});
        error.migration = `${service}/${name}`;
        throw error;
      }
    }
  } finally { await db.end(); }
  return migrationFiles(service).length;
}

async function applyPrisma(plan, service, database) {
  const directory = resolve(REPOSITORY_ROOT, `backend/${service}-service`);
  const cli = resolve(directory, 'node_modules/prisma/build/index.js');
  if (!existsSync(cli)) throw new Error(`${service}: Prisma CLI is not installed.`);
  const original = readEnvironment(`backend/${service}-service/.env`).values.DATABASE_URL;
  const url = new URL(original);
  url.username = encodeURIComponent(plan.admin.user);
  url.password = encodeURIComponent(plan.admin.password);
  url.pathname = `/${database}`;
  await new Promise((done, fail) => {
    let output = '';
    const child = spawn(process.execPath, [cli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
      cwd: directory, env: { ...process.env, DATABASE_URL: url.toString() }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4000); });
    child.on('error', () => fail(new Error(`${service}: Prisma migration process failed.`)));
    child.on('exit', (code) => {
      if (code === 0) return done();
      const error = new Error(`${service}: Prisma migration failed with exit ${code}.`);
      error.safeOutput = output.replaceAll(plan.admin.password, '<redacted>')
        .replaceAll(encodeURIComponent(plan.admin.password), '<redacted>')
        .replace(/postgres(?:ql)?:\/\/\S+/gi, '<redacted-url>');
      fail(error);
    });
  });
  const db = await connect({ ...plan.admin, database });
  try {
    const row = await db.query('SELECT count(*)::int AS applied FROM _prisma_migrations WHERE finished_at IS NOT NULL');
    return row.rows[0].applied;
  } finally { await db.end(); }
}

export async function applyFullMigrations(plan, service, database) {
  if (prismaServices.has(service)) return applyPrisma(plan, service, database);
  if (sqlDirectories[service]) return applySql(plan, service, database);
  throw new Error('Unknown local service migration chain.');
}
