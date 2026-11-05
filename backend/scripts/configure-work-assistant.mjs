// Preserve existing feature flags and prepare the two distinct assistant edges.
import { prepareLocalEnvironments } from './prepare-local-security-env.mjs';
import { commitEnvironments } from './local-security/env-files.mjs';
try {
  const plan = prepareLocalEnvironments();
  console.log(JSON.stringify(process.argv.includes('--write')
    ? { ...commitEnvironments(plan.entries), warnings: plan.warnings }
    : { mode: 'dry-run', changed: plan.entries.filter((entry) => entry.raw !== entry.original).map((entry) => entry.relativePath), warnings: plan.warnings }));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local assistant configuration failed.');
  process.exitCode = 1;
}
