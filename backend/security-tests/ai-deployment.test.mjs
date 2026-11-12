import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateInfrastructure } from '../scripts/check-ai-infrastructure.mjs';

function environment() {
  const env = {
    NODE_ENV: 'production', NOTEBOOK_POSTGRES_USER: 'notebook',
    NOTEBOOK_POSTGRES_PASSWORD: 'p'.repeat(32),
    DATABASE_URL: `postgres://notebook:${'p'.repeat(32)}@infra/notebook_db`,
    REDIS_URL: 'redis://infra/3', AI_ENABLED: 'true',
    CONVERSATION_AI_ENABLED: 'true', WORK_ASSISTANT_ENABLED: 'true',
    MEETING_SUMMARY_ENABLED: 'true',
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
