import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect, identifier, loadDatabasePlan } from './local-security/database-plan.mjs';
import { applyFullMigrations } from './local-security/full-migrations.mjs';

export async function rehearseFreshDatabases(plan = loadDatabasePlan()) {
  const admin = await connect(plan.admin);
  const results = [];
  try {
    for (const name of Object.keys(plan.services)) {
      const scratch = `wh_fresh_verify_${name}_${randomBytes(4).toString('hex')}`;
      if (!scratch.startsWith('wh_fresh_verify_') || Object.values(plan.services).some((service) => service.database === scratch)) throw new Error('Unsafe scratch database name.');
      await admin.query(`CREATE DATABASE ${identifier(scratch)} OWNER ${identifier(plan.admin.user)}`);
      try {
        const migrations = await applyFullMigrations(plan, name, scratch);
        const db = await connect({ ...plan.admin, database: scratch });
        try {
          const tables = await db.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')");
          if (!tables.rows[0]?.count || migrations < 1) throw new Error('Fresh schema is empty.');
          results.push({ service: name, migrations, tables: tables.rows[0].count });
          console.log(JSON.stringify(results.at(-1)));
        } finally { await db.end(); }
      } catch (error) {
        error.service = name;
        throw error;
      } finally {
        await admin.query(`DROP DATABASE ${identifier(scratch)} WITH (FORCE)`);
      }
    }
    return results;
  } finally { await admin.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  rehearseFreshDatabases().catch((error) => {
    console.error(JSON.stringify({ failedService: error.service ?? 'unknown', migration: error.migration ?? null, code: error.code ?? 'MIGRATION_FAILED', detail: error.safeOutput ?? null, secretValuesDisplayed: false }));
    process.exitCode = 1;
  });
}
