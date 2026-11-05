import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect, identifier, loadDatabasePlan } from './local-security/database-plan.mjs';
import { applyDatabaseRoles, verifyDatabaseRoles } from './local-security/database-roles.mjs';
import { applyFullMigrations } from './local-security/full-migrations.mjs';
import { rehearseFreshDatabases } from './rehearse-local-databases.mjs';
import { REPOSITORY_ROOT, readEnvironment } from './local-security/env-files.mjs';

const require = createRequire(resolve(REPOSITORY_ROOT, 'backend/ai-service/api/package.json'));
const requireProject = createRequire(resolve(REPOSITORY_ROOT, 'backend/project-service/package.json'));
const Redis = require('ioredis');
const { Kafka } = requireProject('kafkajs');
const TOPICS = [
  'notification-topic', 'user-profile-events', 'user-direct-message-settings-events',
  'calendar-reminder-events', 'project-task-events', 'project-task-sync-v1',
];
const REDIS_PREFIXES = [
  'AUTH_LOGIN:', 'AUTH_FORGOT:', 'AUTH_VERIFY_EMAIL:', 'AUTH_VERIFY_IP:',
  'AVATAR_UPLOAD:', 'AVATAR_INTENT:', 'AVATAR_CONFIRMED:', 'OTP_FORGOT_PWD:',
  'OTP_FORGOT_ATTEMPTS:', 'wh-notebook:',
];
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function requireLocal(plan) {
  if (!['127.0.0.1', 'localhost', '::1'].includes(plan.admin.host) ||
      Object.entries(plan.services).length !== 7 ||
      Object.values(plan.services).some((service) => !/^wh_(user|project|communication|document|calendar|notification|ai)$/.test(service.role)))
    throw new Error('Reset is limited to the inspected seven local databases.');
  const expected = ['user_db', 'project_db', 'communication_db', 'document_db', 'calendar_db', 'notification_db', 'notebook_db'];
  if (Object.values(plan.services).map((service) => service.database).join(',') !== expected.join(','))
    throw new Error('Local database names changed; reset refused.');
}

export function runtimeDatabaseMode(plan, read = readEnvironment) {
  const modes = new Set();
  for (const [name, service] of Object.entries(plan.services)) {
    const env = read(`backend/${service.directory}/.env`).values;
    let user, password, database, host, port;
    if (name === 'user') {
      ({ POSTGRES_USERNAME: user, POSTGRES_PASSWORD: password, POSTGRES_DB: database,
        POSTGRES_HOST: host, POSTGRES_PORT: port } = env);
    } else {
      const url = new URL(env.DATABASE_URL);
      user = decodeURIComponent(url.username);
      password = decodeURIComponent(url.password);
      database = decodeURIComponent(url.pathname.slice(1));
      host = url.hostname;
      port = url.port || '5432';
    }
    if (database !== service.database || Number(port) !== Number(plan.admin.port) ||
        !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
      throw new Error('Runtime database target differs from the inspected local plan.');
    }
    if (user === plan.admin.user && password === plan.admin.password) modes.add('shared');
    else if (user === service.role && password === service.password) modes.add('restricted');
    else throw new Error('Runtime database credentials differ from the private local plan.');
  }
  if (modes.size !== 1) throw new Error('Mixed runtime database credential modes; reset refused.');
  return [...modes][0];
}

async function dockerTransfer(args, { input, output } = {}) {
  await new Promise((done, fail) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: [input ?? 'ignore', output ?? 'ignore', 'pipe'] });
    child.stderr.resume();
    child.on('error', () => fail(new Error('Local PostgreSQL backup/restore process failed.')));
    child.on('exit', (code) => code === 0 ? done() : fail(new Error('Local PostgreSQL backup/restore process failed.')));
  });
}

async function dockerCapture(args) {
  return new Promise((done, fail) => {
    let output = '';
    const child = spawn('docker', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => { output += chunk.toString(); if (output.length > 1_000_000) child.kill(); });
    child.stderr.resume();
    child.on('error', () => fail(new Error('Local Docker inspection failed.')));
    child.on('exit', (code) => code === 0 ? done(output.trim()) : fail(new Error('Local Docker helper failed.')));
  });
}

async function backupDatabases(plan, directory, admin) {
  mkdirSync(directory, { recursive: true });
  for (const service of Object.values(plan.services)) {
    const file = resolve(directory, `${service.database}.dump`);
    const output = openSync(file, 'wx', 0o600);
    try {
      await dockerTransfer(['exec', '-u', 'postgres', 'wh_postgres', 'pg_dump', '-U', plan.admin.user,
        '-d', service.database, '-Fc', '--no-owner', '--no-acl'], { output });
    } finally { closeSync(output); }
    const scratch = `wh_backup_verify_${service.role}_${randomBytes(4).toString('hex')}`;
    await admin.query(`CREATE DATABASE ${identifier(scratch)} OWNER ${identifier(plan.admin.user)}`);
    try {
      const input = openSync(file, 'r');
      try {
        await dockerTransfer(['exec', '-i', '-u', 'postgres', 'wh_postgres', 'pg_restore', '-U', plan.admin.user,
          '-d', scratch, '--no-owner', '--no-acl', '--exit-on-error'], { input });
      } finally { closeSync(input); }
      const restored = await connect({ ...plan.admin, database: scratch });
      try {
        const tables = await restored.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')");
        if (!tables.rows[0]?.count) throw new Error('Restored backup has no tables.');
      } finally { await restored.end(); }
      console.log(JSON.stringify({ backedUp: service.database, restoreVerified: true }));
    } finally { await admin.query(`DROP DATABASE ${identifier(scratch)} WITH (FORCE)`); }
  }
}

async function assertStopped(plan, admin) {
  const databases = Object.values(plan.services).map((service) => service.database);
  const active = await admin.query('SELECT datname, count(*)::int AS count FROM pg_stat_activity WHERE datname = ANY($1) AND pid <> pg_backend_pid() GROUP BY datname', [databases]);
  if (active.rowCount) throw new Error(`Application DB connections remain: ${active.rows.map((row) => row.datname).join(', ')}.`);
}

async function recreate(admin, plan, service) {
  await assertStopped(plan, admin);
  await admin.query(`DROP DATABASE ${identifier(service.database)}`);
  await admin.query(`CREATE DATABASE ${identifier(service.database)} OWNER ${identifier(plan.admin.user)}`);
}

async function restoreAll(admin, plan, directory, credentialMode) {
  for (const service of Object.values(plan.services)) {
    const file = resolve(directory, `${service.database}.dump`);
    if (!existsSync(file)) throw new Error('A rollback backup is missing.');
    await recreate(admin, plan, service);
    const input = openSync(file, 'r');
    try {
      await dockerTransfer(['exec', '-i', '-u', 'postgres', 'wh_postgres', 'pg_restore', '-U', plan.admin.user,
        '-d', service.database, '--no-owner', '--no-acl', '--exit-on-error'], { input });
    } finally { closeSync(input); }
  }
  if (credentialMode === 'restricted') {
    await applyDatabaseRoles(plan);
    await verifyDatabaseRoles(plan);
  }
}

async function resetKafka() {
  const broker = readEnvironment('backend/project-service/.env').values.KAFKA_BROKER;
  const brokers = broker.split(',').map((part) => part.trim());
  if (brokers.some((part) => !/^(127\.0\.0\.1|localhost):\d+$/.test(part))) throw new Error('Kafka reset requires the local broker.');
  const admin = new Kafka({ clientId: 'workspacehub-local-reset', brokers }).admin();
  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());
    if (TOPICS.some((topic) => !existing.has(topic))) throw new Error('An expected WorkspaceHub Kafka topic is absent.');
    const groups = (await admin.listGroups()).groups.map((group) => group.groupId);
    const selected = [];
    for (const groupId of groups) {
      const offsets = await admin.fetchOffsets({ groupId });
      const names = offsets.map((item) => item.topic);
      if (names.some((name) => TOPICS.includes(name)) || groupId === 'notification-service-group-server') {
        if (names.some((name) => !TOPICS.includes(name))) throw new Error('A Kafka group also consumes an unrelated topic.');
        selected.push(groupId);
      }
    }
    if (selected.length) {
      const result = await admin.deleteGroups(selected);
      if (result.some((item) => item.errorCode !== 0)) throw new Error('WorkspaceHub Kafka group deletion failed.');
    }
    await admin.deleteTopics({ topics: TOPICS, timeout: 30000 });
    let deleted = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const current = new Set(await admin.listTopics());
      if (TOPICS.every((topic) => !current.has(topic))) { deleted = true; break; }
      await sleep(1000);
    }
    if (!deleted) throw new Error('Kafka topic deletion failed.');
    const created = await admin.createTopics({ topics: TOPICS.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })), waitForLeaders: true, timeout: 30000 });
    if (!created) throw new Error('WorkspaceHub Kafka topic recreation failed.');
    console.log(JSON.stringify({ kafkaTopicsReset: TOPICS.length, consumerGroupsReset: selected.length }));
  } finally { await admin.disconnect(); }
}

async function resetRedis() {
  const ai = readEnvironment('backend/ai-service/api/.env').values;
  const redisUrl = new URL(ai.REDIS_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(redisUrl.hostname)) throw new Error('Redis cleanup requires local Redis.');
  const redis = new Redis(ai.REDIS_URL);
  let removed = 0;
  try {
    const patterns = [...REDIS_PREFIXES.map((prefix) => `${prefix}*`), 'AVATAR_CLEANUP'];
    for (const pattern of patterns) {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length) removed += await redis.unlink(...keys);
      } while (cursor !== '0');
    }
  } finally { await redis.quit(); }
  console.log(JSON.stringify({ redisWorkspaceKeysRemoved: removed }));
}

export async function resetQdrant() {
  const env = readEnvironment('backend/ai-service/rag-worker/.env').values;
  const url = new URL(env.QDRANT_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Qdrant cleanup requires a local endpoint.');
  const headers = env.QDRANT_API_KEY ? { 'api-key': env.QDRANT_API_KEY } : {};
  let response;
  try { response = await fetch(new URL('/collections', url), { headers, signal: AbortSignal.timeout(2000) }); }
  catch { response = undefined; }
  let names, remove, finish = async () => {};
  if (response) {
    if (!response.ok) throw new Error('Qdrant collection listing failed.');
    const payload = await response.json();
    names = payload?.result?.collections?.map((item) => item.name) ?? [];
    remove = async (name) => {
      const deleted = await fetch(new URL(`/collections/${name}`, url), { method: 'DELETE', headers, signal: AbortSignal.timeout(10000) });
      if (!deleted.ok) throw new Error('Qdrant collection deletion failed.');
      await deleted.body?.cancel();
    };
  } else {
    // The local Notebook Compose project may be stopped while its volume remains.
    // Inspect the exact volume and temporarily start only its Qdrant container.
    const container = 'wh-notebook-notebook-qdrant-1';
    let detail;
    try { detail = await dockerCapture(['inspect', container, '--format', '{{.State.Running}} {{range .Mounts}}{{.Name}}{{end}}']); }
    catch { console.log(JSON.stringify({ qdrant: 'unavailable-no-container' })); return; }
    const [running, volume] = detail.split(' ');
    if (volume !== 'wh-notebook_notebook-qdrant') throw new Error('Unexpected Qdrant volume; cleanup refused.');
    if (env.QDRANT_API_KEY) throw new Error('Authenticated Qdrant needs an accessible local API.');
    await dockerCapture(['image', 'inspect', 'curlimages/curl:8.11.1', '--format', '{{.Id}}']);
    if (running !== 'true') await dockerCapture(['start', container]);
    if (running !== 'true') finish = () => dockerCapture(['stop', container]);
    try {
      const base = ['run', '--rm', '--network', 'wh-notebook_default', 'curlimages/curl:8.11.1', '-fsS'];
      let listing;
      for (let attempt = 0; attempt < 15; attempt++) {
        try { listing = await dockerCapture([...base, 'http://notebook-qdrant:6333/collections']); break; }
        catch { await sleep(1000); }
      }
      if (!listing) throw new Error('Qdrant container did not become ready.');
      const payload = JSON.parse(listing);
      names = payload?.result?.collections?.map((item) => item.name) ?? [];
      remove = async (name) => {
        await dockerCapture([...base, '-X', 'DELETE', `http://notebook-qdrant:6333/collections/${name}`]);
      };
    } catch (error) { await finish(); throw error; }
  }
  const owned = names.filter((name) => /^wh_notebook_[a-f0-9]{16}$/.test(name));
  try { for (const name of owned) await remove(name); }
  finally { await finish(); }
  console.log(JSON.stringify({ qdrantWorkspaceCollectionsRemoved: owned.length }));
}

export async function resetLocalWorkspace({ apply = false } = {}) {
  const plan = loadDatabasePlan();
  requireLocal(plan);
  const credentialMode = runtimeDatabaseMode(plan);
  if (!apply) return { mode: 'dry-run', credentialMode, databases: Object.values(plan.services).map((service) => service.database), kafkaTopics: TOPICS, redisPrefixes: REDIS_PREFIXES, qdrantPrefix: 'wh_notebook_', noVolumesRemoved: true };
  const admin = await connect(plan.admin);
  const directory = resolve(REPOSITORY_ROOT, '.tmp/security-fresh-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  try {
    const role = await admin.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user');
    if (!role.rows[0]?.rolsuper) throw new Error('Local reset requires migration administrator.');
    await assertStopped(plan, admin);
    await rehearseFreshDatabases(plan);
    await assertStopped(plan, admin);
    await backupDatabases(plan, directory, admin);
    try {
      for (const [name, service] of Object.entries(plan.services)) {
        await recreate(admin, plan, service);
        const migrations = await applyFullMigrations(plan, name, service.database);
        console.log(JSON.stringify({ rebuilt: name, migrations }));
      }
      if (credentialMode === 'restricted') {
        await applyDatabaseRoles(plan);
        await verifyDatabaseRoles(plan);
      }
    } catch (error) {
      try { await restoreAll(admin, plan, directory, credentialMode); }
      catch { throw new Error(`Database rebuild failed and automatic rollback failed. Preserve backups at ${directory}.`); }
      throw new Error(`Database rebuild failed; seven databases restored from backups at ${directory}.`);
    }
    await resetKafka();
    await resetRedis();
    await resetQdrant();
    return { mode: 'applied', credentialMode, backupDirectory: directory, databases: Object.values(plan.services).map((service) => service.database), noVolumesRemoved: true };
  } finally { await admin.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Only --apply is supported.');
  resetLocalWorkspace({ apply: process.argv.includes('--apply') }).then((result) => console.log(JSON.stringify(result, null, 2))).catch(() => {
    console.error('Local reset failed. Review the preceding phase status and private backup directory; no secret values displayed.');
    process.exitCode = 1;
  });
}
