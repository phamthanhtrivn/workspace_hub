import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { LOCAL_SERVICE_DIRECTORIES, CALLER_CREDENTIALS } from './contract.mjs';
import { REPOSITORY_ROOT, commitEnvironments, readEnvironment, setEnvironment, parse } from './env-files.mjs';
import { prepareLocalEnvironments } from '../prepare-local-security-env.mjs';

function fixture() {
  const parent = resolve(REPOSITORY_ROOT, '.tmp');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(resolve(parent, 'security-env-test-'));
  const write = (file, value) => { mkdirSync(dirname(resolve(root, file)), { recursive: true }); writeFileSync(resolve(root, file), value); };
  const directories = [...Object.values(LOCAL_SERVICE_DIRECTORIES), 'ai-service/rag-worker', 'ai-service/speech-worker', 'kong-gateway', 'docker', 'livekit'];
  const services = Object.fromEntries(directories.map((directory) => {
    write(`backend/${directory}/.env`, 'DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:5433/fixture\n');
    return [directory, { variables: {}, current_variables: {} }];
  }));
  write('docs/local-env-contract.json', JSON.stringify({ services }));
  const storage = 'AWS_S3_BUCKET_NAME=fixture-bucket\nAWS_REGION=fixture-region\nAWS_CLOUDFRONT_URL=https://media.invalid\n';
  const livekit = `LIVEKIT_API_KEY=${'a'.repeat(32)}\nLIVEKIT_API_SECRET=${'b'.repeat(64)}\n`;
  write('backend/user-service/.env', storage + `JWT_SECRET_KEY=${'j'.repeat(64)}\n`);
  write('backend/communication-service/.env', storage + livekit + 'MEETING_SUMMARY_ENABLED=false\n');
  write('backend/livekit/.env', livekit);
  write('backend/ai-service/api/.env', 'FRONTEND_URL=http://localhost:3000\nMEETING_SUMMARY_ENABLED=false\nLLM_API_KEY=fixture-provider-credential\n');
  return { root, write, cleanup: () => {
    assert.ok(root.startsWith(parent + '\\') || root.startsWith(parent + '/'));
    rmSync(root, { recursive: true, force: true });
  } };
}

test('preparation creates one distinct 32-byte key per edge and is idempotent without provider/DB changes', () => {
  const f = fixture();
  try {
    const first = prepareLocalEnvironments({ root: f.root });
    const edges = [];
    for (const edge of CALLER_CREDENTIALS) {
      const configured = first.entries.filter((entry) => entry.values[edge.name]);
      assert.equal(configured.length, 2);
      assert.equal(configured[0].values[edge.name], configured[1].values[edge.name]);
      assert.match(configured[0].values[edge.name], /^[a-f0-9]{64}$/);
      edges.push(configured[0].values[edge.name]);
    }
    assert.equal(new Set(edges).size, 16);
    for (const entry of first.entries) {
      const original = parse(entry.original);
      for (const key of ['DATABASE_URL', 'JWT_SECRET_KEY', 'LLM_API_KEY', 'MEETING_SUMMARY_ENABLED'])
        if (original[key] !== undefined) assert.equal(entry.values[key], original[key]);
    }
    commitEnvironments(first.entries, f.root);
    const next = prepareLocalEnvironments({ root: f.root });
    assert.equal(next.generated.length, 0);
    assert.deepEqual(next.entries.filter((entry) => entry.raw !== entry.original), []);
    for (const entry of next.entries) assert.equal(entry.values.INTERNAL_SERVICE_KEY, undefined);
  } finally { f.cleanup(); }
});

test('conflicting existing caller credentials are refused before any env file is written', () => {
  const f = fixture();
  try {
    f.write('backend/project-service/.env', `PROJECT_TO_USER_KEY=${'c'.repeat(64)}\n`);
    f.write('backend/user-service/.env', readFileSync(resolve(f.root, 'backend/user-service/.env'), 'utf8') + `PROJECT_TO_USER_KEY=${'d'.repeat(64)}\n`);
    const before = readFileSync(resolve(f.root, 'backend/project-service/.env'), 'utf8');
    assert.throws(() => prepareLocalEnvironments({ root: f.root }), /PROJECT_TO_USER_KEY: conflicting/);
    assert.equal(readFileSync(resolve(f.root, 'backend/project-service/.env'), 'utf8'), before);
  } finally { f.cleanup(); }
});

test('environment commit detects concurrent user edits and does not overwrite them', () => {
  const f = fixture();
  try {
    const entry = readEnvironment('backend/project-service/.env', f.root);
    setEnvironment(entry, 'PORT', '8082');
    f.write(entry.relativePath, 'USER_EDIT=preserve-this\n');
    assert.throws(() => commitEnvironments([entry], f.root), /changed during preparation/);
    assert.equal(readFileSync(entry.path, 'utf8'), 'USER_EDIT=preserve-this\n');
  } finally { f.cleanup(); }
});

test('failed staging leaves all original env files untouched', () => {
  const f = fixture();
  try {
    const entries = ['project-service', 'document-service'].map((name) => readEnvironment(`backend/${name}/.env`, f.root));
    entries.forEach((entry) => setEnvironment(entry, 'PORT', '8082'));
    f.write(entries[1].relativePath + '.security-preparing', 'unrelated-existing-file\n');
    assert.throws(() => commitEnvironments(entries, f.root), /EEXIST/);
    entries.forEach((entry) => assert.equal(readFileSync(entry.path, 'utf8'), entry.original));
  } finally { f.cleanup(); }
});
