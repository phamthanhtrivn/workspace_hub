import { loadDatabasePlan } from './local-security/database-plan.mjs';
import { LOCAL_SECURITY_MIGRATIONS, applyLocalSecurityMigrations } from './local-security/local-migrations.mjs';

try {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Expected --apply.');
  console.log(JSON.stringify(process.argv.includes('--apply')
    ? await applyLocalSecurityMigrations(loadDatabasePlan())
    : { mode: 'dry-run', migrations: LOCAL_SECURITY_MIGRATIONS, adoptsHistoricalBaselines: false }, null, 2));
} catch (error) {
  if (error?.safeContext) console.error(error.safeContext);
  console.error('Local security migration failed; credential values were suppressed. Code: ' + (typeof error?.code === 'string' ? error.code : 'MIGRATION_VALIDATION_FAILED'));
  process.exitCode = 1;
}
