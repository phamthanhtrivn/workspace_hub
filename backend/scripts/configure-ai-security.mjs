// Local-only: never write deploy/ env files or resurrect shared credentials.
import { prepareLocalEnvironments } from './prepare-local-security-env.mjs';
import { commitEnvironments } from './local-security/env-files.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const planSecurity = prepareLocalEnvironments;
export function configureSecurity() {
  const plan = prepareLocalEnvironments();
  return commitEnvironments(plan.entries).changed.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const plan = prepareLocalEnvironments();
    console.log(JSON.stringify(process.argv.includes('--write')
      ? { ...commitEnvironments(plan.entries), warnings: plan.warnings }
      : { mode: 'dry-run', changed: plan.entries.filter((entry) => entry.raw !== entry.original).map((entry) => entry.relativePath), warnings: plan.warnings }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Local security configuration failed.');
    process.exitCode = 1;
  }
}
