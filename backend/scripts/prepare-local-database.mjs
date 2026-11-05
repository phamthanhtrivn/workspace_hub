import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDatabasePlan, DATABASE_PLAN_PATH } from './local-security/database-plan.mjs';
import { applyDatabaseRoles, verifyDatabaseRoles } from './local-security/database-roles.mjs';
import { readEnvironment, setEnvironment, commitEnvironments } from './local-security/env-files.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--apply', '--verify', '--cutover'].includes(arg))) throw new Error('Expected --apply, --verify or --cutover.');
  const plan = loadDatabasePlan();
  if (args.includes('--apply')) await applyDatabaseRoles(plan);
  if (args.some((arg) => ['--apply', '--verify', '--cutover'].includes(arg))) await verifyDatabaseRoles(plan);
  if (args.includes('--cutover')) {
    const entries = Object.entries(plan.services).map(([name, service]) => {
      const entry = readEnvironment(`backend/${service.directory}/.env`);
      if (name === 'user') {
        setEnvironment(entry, 'POSTGRES_USERNAME', service.role);
        setEnvironment(entry, 'POSTGRES_PASSWORD', service.password);
      } else {
        const url = new URL(entry.values.DATABASE_URL);
        url.username = encodeURIComponent(service.role);
        url.password = encodeURIComponent(service.password);
        setEnvironment(entry, 'DATABASE_URL', url.toString());
      }
      return entry;
    });
    console.log(JSON.stringify(commitEnvironments(entries)));
  }
  console.log(JSON.stringify({ mode: args.length ? args.join(' ') : 'prepared-only', privatePlan: DATABASE_PLAN_PATH, services: Object.fromEntries(Object.entries(plan.services).map(([name, service]) => [name, { database: service.database, role: service.role }])), credentialsDisplayed: false }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    // Driver messages and SQL text can contain passwords; report names/codes only.
    console.error('Local database preparation failed; no credential values displayed. Code: ' + (typeof error?.code === 'string' ? error.code : 'VALIDATION_FAILED'));
    process.exitCode = 1;
  });
}
