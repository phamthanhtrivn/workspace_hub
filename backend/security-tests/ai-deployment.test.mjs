import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInfrastructure } from '../scripts/check-ai-infrastructure.mjs';

function environment() {
  const env = {
    NODE_ENV: 'production', NOTEBOOK_POSTGRES_USER: 'notebook',
    NOTEBOOK_POSTGRES_PASSWORD: 'p'.repeat(32),
    DATABASE_URL: `postgres://notebook:${'p'.repeat(32)}@infra/notebook_db`,
    REDIS_URL: 'redis://infra/3', AI_ENABLED: 'true',
    CONVERSATION_AI_ENABLED: 'true', WORK_ASSISTANT_ENABLED: 'true',
    MEETING_SUMMARY_ENABLED: 'true',
    MEETING_MEDIA_HOSTS: 'media.example',
    JWT_SECRET_KEY: 'j'.repeat(40), JWT_ISSUER: 'workspace-hub',
    FRONTEND_URL: 'https://app.example', DOCUMENT_SERVICE_URL: 'http://document-service:8085',
    RAG_WORKER_URL: 'http://rag-worker:8088', COMPOSE_PROFILES: 'meeting-summary',
    COMMUNICATION_SERVICE_URL: 'http://communication-service:8083', MEETING_STT_URL: 'http://speech-worker:8090',
    WORK_ASSISTANT_PROJECT_URL: 'http://project-service:8082', WORK_ASSISTANT_CALENDAR_URL: 'http://calendar-service:8086',
    LLM_BASE_URL: 'https://provider.example/v1', LLM_API_KEY: 'provider-key', LLM_MODEL: 'model',
  };
  for (const key of ['AI_GATEWAY_KEY', 'AI_DOCUMENT_SERVICE_KEY', 'RAG_SERVICE_KEY',
    'MEETING_STT_SERVICE_KEY', 'AI_TO_USER_KEY', 'AI_TO_COMMUNICATION_KEY',
    'COMMUNICATION_TO_AI_KEY', 'AI_TO_PROJECT_KEY', 'AI_TO_CALENDAR_KEY']) env[key] = key.padEnd(40, 'x');
  for (const key of ['AI_IMAGE', 'RAG_IMAGE', 'SPEECH_IMAGE']) env[key] = `registry/image:sha-${'a'.repeat(40)}`;
  return env;
}

test('production accepts the dedicated keys consumed by the API', () => {
  assert.deepEqual(validateInfrastructure(environment(), true), []);
});

test('legacy keys cannot replace runtime keys in production', () => {
  const env = environment();
  env.AI_COMMUNICATION_SERVICE_KEY = 'c'.repeat(40);
  env.WORK_ASSISTANT_SERVICE_KEY = 'w'.repeat(40);
  for (const key of ['AI_TO_USER_KEY', 'AI_TO_COMMUNICATION_KEY', 'COMMUNICATION_TO_AI_KEY',
    'AI_TO_PROJECT_KEY', 'AI_TO_CALENDAR_KEY']) {
    const incomplete = { ...env };
    delete incomplete[key];
    assert.ok(validateInfrastructure(incomplete, true).includes(key), key);
  }
});

test('production rejects a credential reused across service boundaries', () => {
  const env = environment();
  env.AI_TO_PROJECT_KEY = env.AI_TO_CALENDAR_KEY;
  assert.ok(validateInfrastructure(env, true).includes('distinct service keys'));
});

test('voice-only deployments require the same speech and communication settings as runtime', () => {
  const env = { ...environment(), MEETING_SUMMARY_ENABLED: 'false', CONVERSATION_AI_ENABLED: 'false', VOICE_TRANSCRIPTION_ENABLED: 'true' };
  assert.deepEqual(validateInfrastructure(env, true), []);
  for (const key of ['AI_TO_COMMUNICATION_KEY', 'COMMUNICATION_TO_AI_KEY', 'MEETING_STT_SERVICE_KEY', 'MEETING_MEDIA_HOSTS']) {
    const incomplete = { ...env };
    delete incomplete[key];
    assert.ok(validateInfrastructure(incomplete, true).includes(key), key);
    assert.ok(validateInfrastructure(incomplete).includes(key), `local ${key}`);
  }
});

test('voice transcription validates its flag and inherits the meeting default', () => {
  const env = environment();
  for (const flag of ['invalid', '']) {
    assert.ok(validateInfrastructure({ ...env, VOICE_TRANSCRIPTION_ENABLED: flag }, true).includes('VOICE_TRANSCRIPTION_ENABLED'));
  }
  delete env.MEETING_MEDIA_HOSTS;
  assert.ok(validateInfrastructure(env, true).includes('MEETING_MEDIA_HOSTS'));
});

test('disabled speech and conversation do not require their runtime access settings', () => {
  const env = { ...environment(), MEETING_SUMMARY_ENABLED: 'false', VOICE_TRANSCRIPTION_ENABLED: 'false', CONVERSATION_AI_ENABLED: 'false' };
  for (const key of ['AI_TO_COMMUNICATION_KEY', 'COMMUNICATION_TO_AI_KEY', 'MEETING_MEDIA_HOSTS']) delete env[key];
  assert.deepEqual(validateInfrastructure(env, true), []);
});

test('production rejects missing auth, local-only URLs and an unreachable container bind', () => {
  const env = environment();
  for (const key of ['JWT_SECRET_KEY', 'JWT_ISSUER', 'FRONTEND_URL', 'DOCUMENT_SERVICE_URL', 'RAG_WORKER_URL']) {
    const incomplete = { ...env };
    delete incomplete[key];
    assert.ok(validateInfrastructure(incomplete, true).includes(key), key);
  }
  for (const key of ['FRONTEND_URL', 'DOCUMENT_SERVICE_URL', 'RAG_WORKER_URL']) {
    assert.ok(validateInfrastructure({ ...env, [key]: 'http://127.0.0.1:8088' }, true).includes(key), key);
  }
  assert.ok(validateInfrastructure({ ...env, BIND_HOST: '127.0.0.1' }, true).includes('BIND_HOST'));
});

test('production requires the speech Compose profile for voice-only deployments', () => {
  const env = { ...environment(), MEETING_SUMMARY_ENABLED: 'false', VOICE_TRANSCRIPTION_ENABLED: 'true' };
  delete env.COMPOSE_PROFILES;
  assert.ok(validateInfrastructure(env, true).includes('COMPOSE_PROFILES'));
});

test('preflight rejects unsupported embedding providers, models and incomplete external credentials', () => {
  for (const provider of ['api', 'gemini']) {
    const errors = validateInfrastructure({ ...environment(), EMBEDDING_PROVIDER: provider }, true);
    assert.ok(errors.includes('EMBEDDING_MODEL'));
    assert.ok(errors.includes('EMBEDDING_API_KEY'));
  }
  assert.ok(validateInfrastructure({ ...environment(), EMBEDDING_PROVIDER: 'unknown' }, true).includes('EMBEDDING_PROVIDER'));
  assert.ok(validateInfrastructure({ ...environment(), EMBEDDING_INDEX_STRATEGY: 'unknown' }, true).includes('EMBEDDING_INDEX_STRATEGY'));
  assert.ok(validateInfrastructure({ ...environment(), EMBEDDING_LOCAL_ENABLED: 'true' }, true).includes('EMBEDDING_PROVIDER'));
  const gemini = { ...environment(), EMBEDDING_PROVIDER: 'gemini', EMBEDDING_MODEL: 'gemini-embedding-2', EMBEDDING_API_KEY: 'provider-key', EMBEDDING_LOCAL_ENABLED: 'true' };
  assert.deepEqual(validateInfrastructure(gemini, true), []);
  assert.ok(validateInfrastructure({ ...gemini, EMBEDDING_DIMENSIONS: '123' }, true).includes('EMBEDDING_DIMENSIONS'));
  assert.ok(validateInfrastructure({ ...gemini, EMBEDDING_SECONDARY_MODEL: gemini.EMBEDDING_MODEL }, true).includes('EMBEDDING_SECONDARY_MODEL'));
});

test('enabled production features cannot inherit localhost dependency URLs', () => {
  for (const key of ['COMMUNICATION_SERVICE_URL', 'MEETING_STT_URL', 'WORK_ASSISTANT_PROJECT_URL', 'WORK_ASSISTANT_CALENDAR_URL']) {
    assert.ok(validateInfrastructure({ ...environment(), [key]: 'http://localhost:8080' }, true).includes(key), key);
  }
});

test('local API embeddings retain the explicitly trusted unauthenticated local-server option', () => {
  const env = { ...environment(), EMBEDDING_PROVIDER: 'api', EMBEDDING_BASE_URL: 'http://host.docker.internal:8080/v1' };
  assert.deepEqual(validateInfrastructure(env), []);
  const production = validateInfrastructure(env, true);
  for (const key of ['EMBEDDING_BASE_URL', 'EMBEDDING_MODEL', 'EMBEDDING_API_KEY']) assert.ok(production.includes(key), key);
});

test('production Compose renders safely with the validated synthetic contract', {
  skip: process.env.WORKSPACEHUB_AI_INTEGRATION !== '1',
}, () => {
  const env = environment();
  assert.deepEqual(validateInfrastructure(env, true), []);
  const directory = mkdtempSync(join(tmpdir(), 'wh-ai-compose-review-'));
  const file = join(directory, 'synthetic.env');
  try {
    writeFileSync(file, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n'), { mode: 0o600 });
    const compose = fileURLToPath(new URL('../../deploy/ai/compose.production.yml', import.meta.url));
    const rendered = JSON.parse(execFileSync('docker', ['compose', '--env-file', file, '-f', compose, 'config', '--no-env-resolution', '--format', 'json'], { encoding: 'utf8', env: { ...process.env, ...env }, windowsHide: true }));
    const services = rendered.services;
    assert.equal(services['rag-worker'].deploy.replicas, 1);
    assert.equal(services['notebook-api'].ports, undefined, 'production API is reached only via gateway network');
    assert.equal(services['rag-worker'].ports, undefined);
    assert.equal(services['speech-worker'].ports, undefined);
    assert.equal(services['rag-worker'].environment.DATABASE_URL, undefined, 'RAG never receives database credentials');
    assert.equal(services['rag-worker'].environment.LLM_API_KEY, undefined);
    assert.equal(services['notebook-api'].depends_on.migrate.condition, 'service_completed_successfully');
    assert.equal(services['notebook-jobs'].depends_on['rag-worker'].condition, 'service_healthy');
    assert.equal(services['notebook-qdrant'].logging.options['max-size'], '10m');
  } finally {
    unlinkSync(file);
    rmdirSync(directory);
  }
});
