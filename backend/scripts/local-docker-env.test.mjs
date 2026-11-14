import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { prepareDockerEnvironments, writeDockerEnvironments } from './prepare-local-docker-env.mjs';
import { validateDockerEnvironment } from './validate-local-docker-env.mjs';
import { parse } from './local-security/env-files.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'wh-docker-env-'));
  const write = (file, content) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), content); };
  write('backend/ai-service/api/.env', 'DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:5433/notebook_db\nREDIS_URL=redis://127.0.0.1:6379\nLLM_MODEL=host-model\nLLM_MAX_TOKENS=10000\nAI_GATEWAY_KEY=test-gateway\nDOCUMENT_SERVICE_URL=http://127.0.0.1:8085\n');
  write('backend/docker/.env', 'POSTGRES_USER=fixture\nPOSTGRES_PASSWORD=fixture\n');
  write('backend/kong-gateway/.env', 'AI_GATEWAY_KEY=test-gateway\n');
  write('backend/livekit/.env', 'LIVEKIT_API_KEY=test-livekit\n');
  write('backend/docker/ai/.env', 'LLM_MODEL=old-model\nMEETING_STT_PYTHON=host-only\nMEETING_MEDIA_HOSTS=media.invalid\n');
  const variables = { infra: ['POSTGRES_USER', 'POSTGRES_PASSWORD'], gateway: ['AI_GATEWAY_KEY'], realtime: ['LIVEKIT_API_KEY'], ai: ['LLM_MODEL', 'LLM_MAX_TOKENS', 'BIND_HOST', 'DATABASE_URL', 'DOCUMENT_SERVICE_URL', 'REDIS_URL', 'MEETING_STT_URL', 'MEETING_MEDIA_HOSTS'] };
  for (const [group, names] of Object.entries(variables)) write(`backend/docker/${group}/compose.yml`, names.map(name => '${' + name + '}').join('\n'));
  return { root, write, cleanup: () => { assert.equal(dirname(root), tmpdir()); assert.ok(root.split(/[\\/]/).at(-1).startsWith('wh-docker-env-')); rmSync(root, { recursive: true, force: true }); } };
}

test('Docker preparation is read-only, projects settings and excludes host-only options', () => {
  const f = fixture();
  try {
    const plan = prepareDockerEnvironments({ root: f.root });
    const ai = parse(plan.entries.find(e => e.relativePath.endsWith('ai/.env')).raw);
    assert.equal(ai.LLM_MODEL, 'host-model'); assert.equal(ai.LLM_MAX_TOKENS, '10000');
    assert.equal(new URL(ai.DATABASE_URL).hostname, 'postgres');
    assert.equal(new URL(ai.DOCUMENT_SERVICE_URL).hostname, 'host.docker.internal');
    assert.equal(ai.MEETING_STT_URL, 'http://speech-worker:8090');
    assert.equal(ai.MEETING_STT_PYTHON, undefined);
    assert.equal(existsSync(join(f.root, 'backend/docker/infra/.env')), false);
  } finally { f.cleanup(); }
});

test('Docker migration backs up sources, preserves host config and is idempotent', () => {
  const f = fixture();
  try {
    const original = readFileSync(join(f.root, 'backend/ai-service/api/.env'), 'utf8');
    const result = writeDockerEnvironments(prepareDockerEnvironments({ root: f.root }), f.root);
    assert.equal(readFileSync(join(f.root, 'backend/ai-service/api/.env'), 'utf8'), original);
    assert.ok(existsSync(join(result.sourceBackupDirectory, 'backend/docker/.env')));
    assert.equal(existsSync(join(f.root, 'backend/docker/.env')), false);
    const again = prepareDockerEnvironments({ root: f.root });
    assert.ok(again.entries.every(e => e.raw === e.original));
    assert.equal(validateDockerEnvironment({ root: f.root }).valid, true);
    f.write('backend/docker/ai/.env', readFileSync(join(f.root, 'backend/docker/ai/.env'), 'utf8') + 'LLM_MAX_TOKENS=256\n');
    assert.equal(validateDockerEnvironment({ root: f.root }).valid, false);
  } finally { f.cleanup(); }
});

test('conflicting credentials and concurrent source edits are rejected without overwrite', () => {
  const f = fixture();
  try {
    const plan = prepareDockerEnvironments({ root: f.root });
    f.write('backend/kong-gateway/.env', 'AI_GATEWAY_KEY=conflicting\n');
    assert.throws(() => writeDockerEnvironments(plan, f.root), /changed during preparation/);
    assert.throws(() => prepareDockerEnvironments({ root: f.root }), /gateway\/host mismatch/);
    assert.equal(existsSync(join(f.root, 'backend/docker/.env')), true);
    assert.equal(existsSync(join(f.root, 'backend/docker/infra/.env')), false);
  } finally { f.cleanup(); }
});
