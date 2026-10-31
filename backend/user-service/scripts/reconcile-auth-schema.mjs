#!/usr/bin/env node
// Local PostgreSQL 15 reconciliation. Uses its psql client; no npm packages or runtime dependencies.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../src/main/resources/db/migration');
const migrations = [
  'V1__create_user_schema.sql',
  'V2__auth_session_rotation_and_reset_grants.sql',
  'V3__unique_oauth_provider_subject.sql',
  'V4__legacy_account_setting_defaults.sql',
];
const historyTable = 'workspacehub_schema_history';
const baseColumns = {
  users: { id: 'uuid!', email: 'varchar!', password_hash: 'varchar', status: 'varchar!', role: 'varchar!', created_at: 'timestamp', updated_at: 'timestamp' },
  user_profiles: { id: 'uuid!', user_id: 'uuid!', full_name: 'varchar', avatar_url: 'varchar', phone_number: 'varchar', dob: 'date', bio: 'text', created_at: 'timestamp', updated_at: 'timestamp' },
  account_settings: { id: 'uuid!', user_id: 'uuid!', theme: 'varchar', language: 'varchar', timezone: 'varchar', allow_new_direct_messages: 'boolean!', mute_notification: 'boolean!', created_at: 'timestamp', updated_at: 'timestamp' },
  oauth_accounts: { id: 'uuid!', user_id: 'uuid!', provider: 'varchar!', provider_user_id: 'varchar!', created_at: 'timestamp', updated_at: 'timestamp' },
  refresh_tokens: { id: 'uuid!', user_id: 'uuid!', token_hash: 'varchar!', expires_at: 'timestamp!', revoked: 'boolean!', revoked_at: 'timestamp', device_id: 'varchar', ip_address: 'varchar', device_name: 'varchar', browser: 'varchar', operating_system: 'varchar', platform: 'varchar', location: 'varchar', created_at: 'timestamp' },
};
const authColumns = {
  users: { email_verified: 'boolean' },
  refresh_tokens: { family_id: 'uuid', rotated_at: 'timestamp' },
  password_reset_grants: { id: 'uuid!', user_id: 'uuid!', expires_at: 'timestamp!', consumed_at: 'timestamp' },
};
const tables = [...Object.keys(baseColumns), 'password_reset_grants', historyTable];
const indices = [
  { table: 'users', name: 'idx_user_email', keys: ['email'], unique: false },
  { table: 'users', name: 'users_email_normalized_key', expression: 'lower(btrim(email))', unique: true },
  { table: 'refresh_tokens', name: 'refresh_tokens_family_id_idx', keys: ['family_id'], unique: false },
  { table: 'refresh_tokens', name: 'refresh_tokens_user_id_revoked_idx', keys: ['user_id', 'revoked'], unique: false },
  { table: 'password_reset_grants', name: 'password_reset_grants_expires_at_idx', keys: ['expires_at'], unique: false },
  { table: 'oauth_accounts', name: 'oauth_accounts_provider_subject_key', keys: ['provider', 'provider_user_id'], unique: true },
];

const metadataSql = `SELECT json_build_object(
 'database',current_database(),'schema',current_schema(),'version',current_setting('server_version_num')::int,
 'tables',(SELECT coalesce(json_agg(tablename),'[]') FROM pg_tables WHERE schemaname='public'),
 'columns',(SELECT coalesce(json_agg(json_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'required',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
 LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
 WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(json_agg(json_build_object('table',c.conrelid::regclass::text,'kind',c.contype,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated,
 'keys',(SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num),
 'reference',CASE WHEN c.contype='f' THEN c.confrelid::regclass::text END,
 'referenceKeys',(SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(c.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num),'delete',c.confdeltype)),'[]')
 FROM pg_constraint c WHERE c.connamespace='public'::regnamespace),
 'indices',(SELECT coalesce(json_agg(json_build_object('table',t.relname,'name',i.relname,'unique',x.indisunique,'valid',x.indisvalid,'ready',x.indisready,'method',am.amname,'predicate',pg_get_expr(x.indpred,x.indrelid),'expression',pg_get_expr(x.indexprs,x.indrelid),
 'keys',(SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(x.indkey) WITH ORDINALITY k(num,ord) LEFT JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num),'attributes',x.indnatts,'keyAttributes',x.indnkeyatts)),'[]')
 FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_am am ON am.oid=i.relam WHERE n.nspname='public')
);`;

class PsqlSession {
  constructor(container, user) {
    this.child = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', 'user_db'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.output = '';
    this.child.stdin.on('error', () => this.fail());
    this.child.stderr.on('data', () => {}); // SQL error detail can contain account values; never forward it.
    this.child.stdout.on('data', chunk => {
      this.output += chunk.toString();
      const end = this.output.indexOf('__USER_SCHEMA_RESULT_END__\n');
      if (end >= 0 && this.pending) {
        const result = this.output.slice(0, end).trim();
        this.output = this.output.slice(end + '__USER_SCHEMA_RESULT_END__\n'.length);
        const pending = this.pending; this.pending = undefined; pending.resolve(result);
      }
    });
    this.done = new Promise(resolveDone => {
      this.child.on('error', () => this.fail());
      this.child.on('close', code => { this.fail(); resolveDone(code); });
    });
  }
  fail() { this.closed = true; this.pending?.reject(new Error('PostgreSQL command failed; the transaction was not committed.')); this.pending = undefined; }
  query(sql) {
    if (this.closed) return Promise.reject(new Error('PostgreSQL connection is closed.'));
    return new Promise((resolveResult, reject) => {
      this.pending = { resolve: resolveResult, reject };
      this.child.stdin.write(sql + '\n\\echo __USER_SCHEMA_RESULT_END__\n');
    });
  }
  async end() { this.child.stdin.end(); await this.done; }
}

const sameKeys = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const normalizeSql = sql => (sql ?? '').replace(/::(?:character varying|text)(?:\[\])?/gi, '').replace(/[\s()"]/g, '').toLowerCase();
const column = (state, table, name) => state.columns.find(c => c.table === table && c.name === name);
function requireCompatible(condition, message) { if (!condition) throw new Error('Unsupported schema: ' + message); }
function validateColumns(state, table, expected, optional = false) {
  for (const [name, spec] of Object.entries(expected)) {
    const c = column(state, table, name);
    if (optional && !c) continue;
    requireCompatible(c, `${table}.${name} is missing; this is not a V1 baseline`);
    const type = spec.replace('!', '');
    const typeMatches = type === 'varchar' ? /^character varying\((\d+)\)$/.test(c.type) && Number(c.type.match(/\d+/)[0]) >= 255
      : type === 'timestamp' ? /^timestamp(?:\(6\))? without time zone$/.test(c.type)
      : type === 'timestamptz' ? /^timestamp(?:\(6\))? with time zone$/.test(c.type) : c.type === type;
    requireCompatible(typeMatches, `${table}.${name} has a different type`);
    if (spec.endsWith('!')) requireCompatible(c.required, `${table}.${name} must be NOT NULL`);
  }
}

function inspect(state, quality) {
  requireCompatible(state.database === 'user_db' && state.schema === 'public' && Math.floor(state.version / 10000) === 15, 'expected user_db/public on PostgreSQL 15');
  const statements = [], changes = [];
  const repair = (description, sql) => { changes.push(description); statements.push(sql); };
  for (const [table, expected] of Object.entries(baseColumns)) {
    requireCompatible(state.tables.includes(table), `missing base table ${table}; use the migration runner for a new database`);
    validateColumns(state, table, expected);
    requireCompatible(state.constraints.some(c => c.table === table && c.kind === 'p' && sameKeys(c.keys, ['id'])), `${table} primary key differs`);
    const known = new Set([...Object.keys(expected), ...Object.keys(authColumns[table] ?? {}), ...(table === 'account_settings' ? ['allow_search_by_email', 'notification_alert_enabled'] : [])]);
    requireCompatible(!state.columns.some(c => c.table === table && !known.has(c.name) && c.required && !c.default), `${table} has an unknown mandatory column`);
  }
  for (const [table, names] of Object.entries(authColumns)) validateColumns(state, table, names, !state.tables.includes(table) || table !== 'password_reset_grants');
  for (const [table, key] of [['users', 'email'], ['user_profiles', 'user_id'], ['account_settings', 'user_id'], ['refresh_tokens', 'token_hash']]) {
    requireCompatible(state.indices.some(i => i.table === table && i.unique && i.valid && !i.predicate && !i.expression && sameKeys(i.keys, [key])), `${table}.${key} unique constraint differs`);
  }
  for (const [table, key, values] of [['users', 'status', ['ACTIVE', 'LOCKED']], ['users', 'role', ['USER', 'ADMIN']], ['oauth_accounts', 'provider', ['GOOGLE', 'LINKEDIN']]]) {
    const expected = normalizeSql(`CHECK (${key} = ANY (ARRAY[${values.map(v => `'${v}'`).join(',')}]))`);
    requireCompatible(state.constraints.some(c => c.table === table && c.kind === 'c' && c.validated && normalizeSql(c.definition) === expected), `${table}.${key} enum check differs`);
  }
  requireCompatible(!quality.emailCollisions && !quality.oauthCollisions && !quality.orphans, 'duplicate identities or orphaned relationships require manual resolution');

  const verified = column(state, 'users', 'email_verified');
  if (!verified) repair('add unverified email flag', 'ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;');
  else {
    if (!verified.required) repair('backfill null verification flags', 'UPDATE users SET email_verified=false WHERE email_verified IS NULL; ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;');
    if (normalizeSql(verified.default) !== 'false') repair('set unverified default', 'ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;');
  }
  const family = column(state, 'refresh_tokens', 'family_id');
  if (!family) repair('add stable token families', 'ALTER TABLE refresh_tokens ADD COLUMN family_id uuid; UPDATE refresh_tokens SET family_id=id WHERE family_id IS NULL; ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;');
  else if (!family.required) repair('backfill missing token families', 'UPDATE refresh_tokens SET family_id=id WHERE family_id IS NULL; ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;');
  if (!column(state, 'refresh_tokens', 'rotated_at')) repair('add rotation timestamp', 'ALTER TABLE refresh_tokens ADD COLUMN rotated_at timestamp(6);');
  if (quality.unnormalizedEmails) repair('normalize email case/outer spaces', 'UPDATE users SET email=lower(btrim(email)) WHERE email<>lower(btrim(email));');
  if (!state.tables.includes('password_reset_grants')) repair('add password reset grants', 'CREATE TABLE password_reset_grants (id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamp(6) NOT NULL,consumed_at timestamp(6));');
  else requireCompatible(state.constraints.some(c => c.table === 'password_reset_grants' && c.kind === 'p' && sameKeys(c.keys, ['id'])), 'password_reset_grants primary key differs');

  for (const table of ['user_profiles', 'account_settings', 'oauth_accounts', 'refresh_tokens', 'password_reset_grants']) {
    if (!state.tables.includes(table)) continue;
    const fk = state.constraints.filter(c => c.table === table && c.kind === 'f' && sameKeys(c.keys, ['user_id']));
    const deletion = table === 'password_reset_grants' ? 'c' : 'a';
    if (!fk.length && table === 'password_reset_grants') repair('add reset-grant owner FK', 'ALTER TABLE password_reset_grants ADD CONSTRAINT password_reset_grants_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;');
    else requireCompatible(fk.length === 1 && fk[0].reference === 'users' && sameKeys(fk[0].referenceKeys, ['id']) && fk[0].delete === deletion && fk[0].validated, `${table} owner FK differs`);
  }
  for (const expected of indices) {
    const matches = i => i.table === expected.table && i.unique === expected.unique && i.valid && i.ready && i.method === 'btree' && !i.predicate && i.attributes === i.keyAttributes &&
      (expected.expression ? normalizeSql(i.expression) === normalizeSql(expected.expression) : !i.expression && sameKeys(i.keys, expected.keys));
    const named = state.indices.find(i => i.name === expected.name);
    requireCompatible(!named || matches(named), `${expected.name} has a conflicting definition`);
    if (!state.indices.some(matches)) repair(`add ${expected.name}`, `CREATE ${expected.unique ? 'UNIQUE ' : ''}INDEX ${expected.name} ON ${expected.table}(${expected.expression ?? expected.keys.join(',')});`);
  }
  const legacy = column(state, 'account_settings', 'allow_search_by_email');
  if (legacy) {
    requireCompatible(legacy.type === 'boolean', 'legacy search preference has a different type');
    if (normalizeSql(legacy.default) !== 'true') changes.push('apply legacy search preference default migration');
  }
  return { changes, statements };
}

async function metadata(session) { return JSON.parse(await session.query(metadataSql)); }
async function quality(session, state) {
  const owners = ['user_profiles', 'account_settings', 'oauth_accounts', 'refresh_tokens', 'password_reset_grants'].filter(t => state.tables.includes(t));
  return JSON.parse(await session.query(`SELECT json_build_object(
 'emailCollisions',(SELECT count(*) FROM (SELECT lower(btrim(email)) FROM users GROUP BY lower(btrim(email)) HAVING count(*)>1) x),
 'oauthCollisions',(SELECT count(*) FROM (SELECT provider,provider_user_id FROM oauth_accounts GROUP BY provider,provider_user_id HAVING count(*)>1) x),
 'unnormalizedEmails',(SELECT count(*) FROM users WHERE email<>lower(btrim(email))),
 'orphans',${owners.map(t => `(SELECT count(*) FROM ${t} c LEFT JOIN users u ON u.id=c.user_id WHERE u.id IS NULL)`).join('+')});`));
}

async function history(session, state, checksums) {
  if (!state.tables.includes(historyTable)) return [];
  validateColumns(state, historyTable, { filename: 'text!', checksum: 'text!', applied_at: 'timestamptz!' });
  requireCompatible(state.constraints.some(c => c.table === historyTable && c.kind === 'p' && sameKeys(c.keys, ['filename'])), 'migration history primary key differs');
  const rows = JSON.parse(await session.query(`SELECT coalesce(json_agg(json_build_object('filename',filename,'checksum',checksum)),'[]') FROM ${historyTable};`));
  requireCompatible(rows.every(r => checksums[r.filename] === r.checksum), 'unknown migration or checksum mismatch');
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('node --env-file=backend/user-service/.env backend/user-service/scripts/reconcile-auth-schema.mjs [--check | --apply --adopt-baseline] [--container wh_postgres]'); return; }
  requireCompatible(args.every((arg, index) => ['--check', '--apply', '--adopt-baseline', '--container'].includes(arg) || args[index - 1] === '--container'), 'unknown argument');
  const apply = args.includes('--apply');
  requireCompatible(!apply || args.includes('--adopt-baseline'), '--apply requires explicit --adopt-baseline');
  requireCompatible(!(apply && args.includes('--check')), 'choose check or apply');
  const containerIndex = args.indexOf('--container');
  const container = containerIndex >= 0 ? args[containerIndex + 1] : 'wh_postgres';
  requireCompatible(typeof container === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(container), 'invalid container');
  const user = process.env.PGUSER || process.env.POSTGRES_USERNAME;
  requireCompatible(Boolean(user), 'PGUSER or POSTGRES_USERNAME is required');
  const sources = Object.fromEntries(migrations.map(name => {
    const sql = readFileSync(resolve(migrationDirectory, name));
    requireCompatible(!sql.includes(13), 'migration files must use LF line endings');
    return [name, sql];
  }));
  const checksums = Object.fromEntries(migrations.map(name => [name, createHash('sha256').update(sources[name]).digest('hex')]));
  const session = new PsqlSession(container, user);
  try {
    await session.query(apply ? "BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'; SELECT pg_advisory_xact_lock(82463001);" : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;');
    let state = await metadata(session);
    requireCompatible(state.database === 'user_db' && state.schema === 'public' && Math.floor(state.version / 10000) === 15, 'expected user_db/public on PostgreSQL 15');
    for (const table of Object.keys(baseColumns)) requireCompatible(state.tables.includes(table), `missing ${table}; initialize new databases with the migration runner`);
    if (apply) {
      await session.query(`LOCK TABLE ${tables.filter(t => state.tables.includes(t)).map(t => `public.${t}`).join(',')} IN SHARE ROW EXCLUSIVE MODE;`);
      state = await metadata(session);
    }
    const rows = await history(session, state, checksums);
    const plan = inspect(state, await quality(session, state));
    const missingHistory = migrations.filter(name => !rows.some(r => r.filename === name));
    if (!apply) {
      await session.query('ROLLBACK;');
      console.log(JSON.stringify({ mode: 'check', database: 'user_db', compatible: !plan.changes.length && !missingHistory.length, changes: plan.changes, missingHistory }, null, 2));
      process.exitCode = plan.changes.length || missingHistory.length ? 1 : 0;
      return;
    }
    for (const sql of plan.statements) await session.query(sql);
    if (missingHistory.includes(migrations[3]) || plan.changes.includes('apply legacy search preference default migration')) await session.query(sources[migrations[3]].toString());
    state = await metadata(session);
    requireCompatible(inspect(state, await quality(session, state)).changes.length === 0, 'post-repair verification did not pass');
    await session.query(`CREATE TABLE IF NOT EXISTS ${historyTable} (filename text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());`);
    for (const name of missingHistory) await session.query(`INSERT INTO ${historyTable}(filename,checksum) VALUES ('${name}','${checksums[name]}');`);
    state = await metadata(session);
    requireCompatible((await history(session, state, checksums)).length === migrations.length, 'history verification did not pass');
    await session.query('COMMIT;');
    console.log(JSON.stringify({ mode: 'apply', database: 'user_db', repaired: plan.changes, adoptedBaseline: missingHistory.filter(name => name !== migrations[3]), executedMigration: missingHistory.includes(migrations[3]) ? migrations[3] : null, historyVerified: true }, null, 2));
  } catch (error) {
    if (!session.closed) await session.query('ROLLBACK;').catch(() => {});
    throw error;
  } finally { await session.end(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 2; });
