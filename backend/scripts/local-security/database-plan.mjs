import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { LOCAL_SERVICE_DIRECTORIES } from './contract.mjs';
import { REPOSITORY_ROOT, readEnvironment } from './env-files.mjs';

export const DATABASE_PLAN_PATH = 'backend/.env.security-db-plan.json';
const require = createRequire(resolve(REPOSITORY_ROOT, 'backend/ai-service/package.json'));
const { Client } = require('pg');
export const identifier = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error('Invalid local database identifier.');
  return `"${name}"`;
};

export async function connect(configuration) {
  const client = new Client({ ...configuration, connectionTimeoutMillis: 5000, application_name: 'workspacehub-local-security' });
  client.on('error', () => {});
  try { await client.connect(); return client; }
  catch (error) { await client.end().catch(() => {}); throw error; }
}

export function loadDatabasePlan(root = REPOSITORY_ROOT) {
  const planPath = resolve(root, DATABASE_PLAN_PATH);
  if (existsSync(planPath)) {
    const plan = JSON.parse(readFileSync(planPath, 'utf8'));
    if (plan.version !== 1 || !plan.admin || !plan.services) throw new Error('Invalid existing private database plan.');
    return plan;
  }
  const user = readEnvironment('backend/user-service/.env', root).values;
  const admin = { host: user.POSTGRES_HOST, port: Number(user.POSTGRES_PORT), user: user.POSTGRES_USERNAME, password: user.POSTGRES_PASSWORD, database: 'postgres' };
  if (!['127.0.0.1', 'localhost', '::1'].includes(admin.host)) throw new Error('Database preparation is restricted to local PostgreSQL.');
  const services = Object.fromEntries(Object.entries(LOCAL_SERVICE_DIRECTORIES).map(([service, directory]) => {
    const entry = readEnvironment(`backend/${directory}/.env`, root);
    let database = entry.values.POSTGRES_DB;
    if (service !== 'user') {
      const url = new URL(entry.values.DATABASE_URL);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || Number(url.port || 5432) !== admin.port) throw new Error(`${service}: database does not use the inspected local PostgreSQL instance.`);
      database = decodeURIComponent(url.pathname.slice(1));
    }
    identifier(database);
    return [service, { directory, database, role: `wh_${service}`, password: randomBytes(32).toString('hex') }];
  }));
  const plan = { version: 1, admin, services };
  // This private, ignored file is a credential handoff to the local DB tool,
  // not an application runtime variable or a committed deployment artifact.
  writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return plan;
}
