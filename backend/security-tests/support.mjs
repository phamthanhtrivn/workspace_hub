import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const serviceRequire = (service) => createRequire(resolve(root, `backend/${service}/package.json`));
export const projectRequire = serviceRequire('project-service');
export const aiRequire = serviceRequire('ai-service/api');
export const webRequire = createRequire(resolve(root, 'frontend/web/package.json'));
export const load = (service, path) => serviceRequire(service)(`./dist/${path}`);

export async function command(program, args, options = {}) {
  return new Promise((done, fail) => {
    const child = spawn(program, args, { cwd: root, windowsHide: true, ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output = (output + chunk).slice(-12000); });
    child.on('error', fail);
    child.on('exit', (code) => code === 0 ? done(output.trim()) : fail(new Error(`${program} ${args[0]} failed (${code}): ${output.slice(-1500)}`)));
    child.stdin.end(options.input);
  });
}

export async function until(check, description, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const result = await check(); if (result) return result; } catch (error) { last = error; }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`Timed out: ${description}`, { cause: last });
}

export async function unusedPort() {
  const server = createServer();
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}

export async function json(base, path, { method = 'GET', token, cookie, body, headers = {} } = {}) {
  const response = await fetch(new URL(path, base), {
    method, headers: { ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}), ...(cookie ? { cookie } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000), redirect: 'manual',
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

export class IsolatedInfrastructure {
  id = `wh-security-test-${randomBytes(5).toString('hex')}`;
  password = randomBytes(24).toString('hex');
  containers = [];
  clients = [];
  processes = [];
  files = [];
  keys = {};

  async start() {
    await command('docker', ['network', 'create', '--label', `workspacehub.security-test=${this.id}`, this.id]);
    this.networkCreated = true;
    for (const name of ['postgres', 'redis', 'kafka']) {
      this[`${name}Image`] = await command('docker', ['inspect', '--format', '{{.Image}}', `wh_${name}`]);
    }
    this.pgPort = await unusedPort();
    this.redisPort = await unusedPort();
    this.kafkaPort = await unusedPort();
    await this.container('postgres', this.postgresImage, ['-p', `127.0.0.1:${this.pgPort}:5432`, '-e', `POSTGRES_PASSWORD=${this.password}`]);
    await this.container('redis', this.redisImage, ['-p', `127.0.0.1:${this.redisPort}:6379`]);
    await this.container('kafka', this.kafkaImage, ['-p', `127.0.0.1:${this.kafkaPort}:9092`,
      '-e', 'KAFKA_NODE_ID=1', '-e', 'KAFKA_PROCESS_ROLES=broker,controller',
      '-e', 'KAFKA_LISTENERS=HOST://0.0.0.0:9092,INTERNAL://0.0.0.0:29092,CONTROLLER://0.0.0.0:29093',
      '-e', `KAFKA_ADVERTISED_LISTENERS=HOST://127.0.0.1:${this.kafkaPort},INTERNAL://${this.id}-kafka:29092`,
      '-e', 'KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=HOST:PLAINTEXT,INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT',
      '-e', 'KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER', '-e', 'KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL',
      '-e', `KAFKA_CONTROLLER_QUORUM_VOTERS=1@${this.id}-kafka:29093`,
      '-e', 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1', '-e', 'KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1',
      '-e', 'KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1', '-e', 'KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0']);
    const { Client } = aiRequire('pg');
    await until(async () => { const db = new Client(this.pgConfig()); try { await db.connect(); await db.query('SELECT 1'); return true; } finally { await db.end(); } }, 'isolated PostgreSQL');
    const { Kafka, logLevel } = projectRequire('kafkajs');
    this.kafka = new Kafka({ brokers: [`127.0.0.1:${this.kafkaPort}`], logLevel: logLevel.NOTHING, retry: { retries: 2 } });
    this.admin = this.kafka.admin();
    await until(async () => { await this.admin.connect(); return (await this.admin.listTopics()) !== null; }, 'isolated Kafka', 90000);
    this.redis = new (aiRequire('ioredis'))({ host: '127.0.0.1', port: this.redisPort, lazyConnect: true, maxRetriesPerRequest: 1 });
    this.redis.on('error', () => {});
    await this.redis.connect();
    await this.redis.ping();
    const { CALLER_CREDENTIALS } = await import('../scripts/local-security/contract.mjs');
    for (const edge of CALLER_CREDENTIALS) this.keys[edge.name] = randomBytes(32).toString('hex');
    this.keys.JWT_SECRET_KEY = randomBytes(32).toString('hex');
    console.log('# Isolated PostgreSQL/Redis/Kafka ready; application containers untouched.');
  }

  pgConfig(database = 'postgres') { return { host: '127.0.0.1', port: this.pgPort, user: 'postgres', password: this.password, database, connectionTimeoutMillis: 3000 }; }
  dbName(service) { assert.match(service, /^[a-z]+$/); return `wh_security_test_${service}`; }
  dbUrl(service) { return `postgresql://postgres:${this.password}@127.0.0.1:${this.pgPort}/${this.dbName(service)}?schema=public`; }
  async db(service) {
    const { Client } = aiRequire('pg');
    const db = new Client(this.pgConfig(this.dbName(service)));
    db.on('error', () => {});
    await db.connect(); this.clients.push(db); return db;
  }

  async migrate() {
    const { Client } = aiRequire('pg');
    const db = new Client(this.pgConfig()); await db.connect();
    const { applyFullMigrations } = await import('../scripts/local-security/full-migrations.mjs');
    try {
      for (const service of ['user', 'project', 'communication', 'document', 'calendar', 'notification', 'ai']) {
        await db.query(`CREATE DATABASE ${this.dbName(service)}`);
        if (['user', 'project', 'ai'].includes(service)) await applyFullMigrations({ admin: this.pgConfig() }, service, this.dbName(service));
        else {
          const directory = resolve(root, `backend/${service}-service`);
          await command(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { cwd: directory,
            env: { ...process.env, DATABASE_URL: this.dbUrl(service) } });
        }
        console.log(`# Migration chain applied: ${service}`);
      }
    } finally { await db.end(); }
  }

  async container(name, image, args) {
    const fullName = `${this.id}-${name}`;
    this.containers.push(fullName);
    await command('docker', ['run', '-d', '--pull=never', '--name', fullName, '--network', this.id,
      '--label', `workspacehub.security-test=${this.id}`, ...args, image]);
  }
  async control(action, service) {
    assert.ok(['stop', 'start'].includes(action));
    const name = `${this.id}-${service}`;
    assert.ok(this.containers.includes(name));
    const label = await command('docker', ['inspect', '--format', '{{index .Config.Labels "workspacehub.security-test"}}', name]);
    assert.equal(label, this.id);
    await command('docker', [action, ...(action === 'stop' ? ['--time', '2'] : []), name]);
  }

  async startUser() {
    this.userPort = await unusedPort(); this.userUrl = `http://127.0.0.1:${this.userPort}`;
    const env = { ...process.env, ...this.keys, SERVER_PORT: String(this.userPort),
      POSTGRES_HOST: '127.0.0.1', POSTGRES_PORT: String(this.pgPort), POSTGRES_DB: this.dbName('user'), POSTGRES_USERNAME: 'postgres', POSTGRES_PASSWORD: this.password,
      REDIS_HOST: '127.0.0.1', REDIS_PORT: String(this.redisPort), SPRING_DATA_REDIS_TIMEOUT: '1s', SPRING_DATA_REDIS_CONNECT_TIMEOUT: '1s', KAFKA_BROKER: `127.0.0.1:${this.kafkaPort}`,
      GOOGLE_CLIENT_ID: 'security-test.invalid', MAIL_HOST: '127.0.0.1', MAIL_PORT: '1', MAIL_USERNAME: 'test', MAIL_PASSWORD: 'test',
      AWS_S3_BUCKET_NAME: 'security-test-private', AWS_REGION: 'ap-southeast-1', AWS_ACCESS_KEY: 'test-only', AWS_SECRET_KEY: 'test-only',
      SPRING_JPA_SHOW_SQL: 'false', LOGGING_LEVEL_ROOT: 'WARN', SPRING_MAIN_BANNER_MODE: 'off' };
    // Windows Java launchers can fork a JVM and retain its inherited pipes.
    // Spawn the real JVM so teardown owns the application PID itself.
    const settings = await command('java', ['-XshowSettings:properties', '-version']);
    const javaHome = /java\.home\s*=\s*([^\r\n]+)/.exec(settings)?.[1].trim();
    assert.ok(javaHome, 'Java runtime home is discoverable');
    const executable = resolve(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    const child = spawn(executable, ['-jar', 'target/user-service-0.0.1-SNAPSHOT.jar'], {
      cwd: resolve(root, 'backend/user-service'), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.processes.push(child);
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output = (output + chunk).slice(-4000); });
    await until(async () => {
      if (child.exitCode !== null) throw new Error('Test User Service exited');
      return (await json(this.userUrl, '/health')).status === 200;
    }, 'isolated User Service HTTP', 90000).catch((error) => { error.cause = output.replaceAll(this.password, '<test-secret>'); throw error; });
  }

  async startGateway() {
    const image = await command('docker', ['inspect', '--format', '{{.Image}}', 'wh_kong']);
    this.gatewayPort = await unusedPort(); this.gatewayUrl = `http://127.0.0.1:${this.gatewayPort}`;
    const path = resolve(root, '.tmp', `${this.id}-kong.yml`);
    const source = readFileSync(resolve(root, 'backend/kong-gateway/kong.host.yml'), 'utf8')
      .replaceAll('host.docker.internal:8081', `host.docker.internal:${this.userPort}`);
    writeFileSync(path, source, { flag: 'wx' }); this.files.push(path);
    await this.container('kong', image, ['-p', `127.0.0.1:${this.gatewayPort}:8000`,
      '-e', `JWT_SECRET_KEY=${this.keys.JWT_SECRET_KEY}`, '-e', 'FRONTEND_URL=http://localhost:3000',
      '-e', 'KONG_NGINX_WORKER_PROCESSES=1', '-e', 'KONG_ADMIN_LISTEN=off', '-e', 'KONG_LOG_LEVEL=error',
      '-v', `${path}:/usr/local/kong/declarative/kong.template.yml:ro`]);
    await until(async () => (await json(this.gatewayUrl, '/api/users/me/profile')).status === 401, 'isolated Kong gateway', 60000);
  }

  async close() {
    for (const child of this.processes) {
      if (child.exitCode === null) { child.kill(); await new Promise((done) => child.once('exit', done)); }
    }
    for (const db of this.clients) await db.end().catch(() => {});
    await this.admin?.disconnect().catch(() => {});
    this.redis?.disconnect();
    for (const name of this.containers.reverse()) {
      const label = await command('docker', ['inspect', '--format', '{{index .Config.Labels "workspacehub.security-test"}}', name]).catch(() => null);
      if (label === this.id) await command('docker', ['rm', '-f', '-v', name]);
    }
    if (this.networkCreated) await command('docker', ['network', 'rm', this.id]);
    for (const path of this.files) {
      assert.equal(path, resolve(root, '.tmp', `${this.id}-kong.yml`));
      unlinkSync(path);
    }
    console.log('# Removed security-test processes, containers, network and anonymous test volumes.');
  }
}
