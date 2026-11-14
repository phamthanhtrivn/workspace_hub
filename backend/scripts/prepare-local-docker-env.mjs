import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPOSITORY_ROOT, readEnvironment, setEnvironment, commitEnvironments } from './local-security/env-files.mjs';

export const DOCKER_GROUPS = ['infra', 'gateway', 'realtime', 'ai'];
const LEGACY_FILES = {
  infra: 'backend/docker/.env', gateway: 'backend/kong-gateway/.env',
  realtime: 'backend/livekit/.env', ai: 'deploy/ai/.env',
};

export function prepareDockerEnvironments({ root = REPOSITORY_ROOT } = {}) {
  const host = readEnvironment('backend/ai-service/api/.env', root);
  if (!host.exists) throw new Error('Missing backend/ai-service/api/.env');
  const entries = DOCKER_GROUPS.map(group => readEnvironment(`backend/docker/${group}/.env`, root));
  const entry = group => entries[DOCKER_GROUPS.indexOf(group)];
  const source = group => entry(group).exists ? entry(group) : readEnvironment(LEGACY_FILES[group], root);
  const infra = source('infra').values;
  const realtime = { ...infra, ...source('realtime').values };
  realtime.LIVEKIT_EGRESS_SECCOMP_PROFILE ||= resolve(root, 'backend/livekit/config/chrome-sandboxing-seccomp-profile.json');
  const gateway = source('gateway').values;
  const oldAI = source('ai').values;
  const communication = readEnvironment('backend/communication-service/.env', root).values;
  for (const key of ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']) {
    if (communication[key] && realtime[key] !== communication[key])
      throw new Error(`${key}: Communication/realtime mismatch; no files were written.`);
  }
  const user = readEnvironment('backend/user-service/.env', root).values;
  if (user.JWT_SECRET_KEY && gateway.JWT_SECRET_KEY !== user.JWT_SECRET_KEY)
    throw new Error('JWT_SECRET_KEY: User/gateway mismatch; no files were written.');
  for (const key of ['AI_GATEWAY_KEY', 'AI_DOCUMENT_SERVICE_KEY', 'RAG_SERVICE_KEY', 'MEETING_STT_SERVICE_KEY',
    'AI_TO_USER_KEY', 'AI_TO_PROJECT_KEY', 'AI_TO_CALENDAR_KEY', 'AI_TO_COMMUNICATION_KEY', 'COMMUNICATION_TO_AI_KEY']) {
    if (oldAI[key] && host.values[key] && oldAI[key] !== host.values[key])
      throw new Error(`${key}: conflicting AI credentials; no files were written.`);
  }
  if (gateway.AI_GATEWAY_KEY && gateway.AI_GATEWAY_KEY !== host.values.AI_GATEWAY_KEY)
    throw new Error('AI_GATEWAY_KEY: gateway/host mismatch; no files were written.');
  const database = new URL(host.values.DATABASE_URL);
  if (decodeURIComponent(database.username) !== infra.POSTGRES_USER || decodeURIComponent(database.password) !== infra.POSTGRES_PASSWORD)
    throw new Error('DATABASE_URL: local PostgreSQL credential mismatch; no files were written.');
  database.hostname = 'postgres'; database.port = '5432';
  const redis = new URL(oldAI.REDIS_URL || host.values.REDIS_URL);
  redis.hostname = 'redis'; redis.port = '6379';
  const ai = { ...oldAI, ...host.values, BIND_HOST: '0.0.0.0', DATABASE_URL: database.toString(),
    REDIS_URL: redis.toString(), RAG_WORKER_URL: 'http://rag-worker:8088', MEETING_STT_URL: 'http://speech-worker:8090',
    QDRANT_URL: 'http://notebook-qdrant:6333', NOTEBOOK_POSTGRES_USER: infra.POSTGRES_USER,
    NOTEBOOK_POSTGRES_PASSWORD: infra.POSTGRES_PASSWORD,
    VOICE_TRANSCRIPTION_ENABLED: host.values.VOICE_TRANSCRIPTION_ENABLED ?? host.values.MEETING_SUMMARY_ENABLED ?? 'false',
    MEETING_MEDIA_HOSTS: [...new Set([oldAI.MEETING_MEDIA_HOSTS, host.values.MEETING_MEDIA_HOSTS].filter(Boolean).flatMap(v => v.split(',').map(s => s.trim())).filter(Boolean))].join(','),
  };
  for (const key of ['USER_SERVICE_URL', 'DOCUMENT_SERVICE_URL', 'COMMUNICATION_SERVICE_URL', 'WORK_ASSISTANT_PROJECT_URL', 'WORK_ASSISTANT_CALENDAR_URL']) {
    if (host.values[key]) { const url = new URL(host.values[key]); url.hostname = 'host.docker.internal'; ai[key] = url.toString().replace(/\/$/, ''); }
  }
  const values = { infra, realtime, gateway: { ...gateway, AI_GATEWAY_KEY: host.values.AI_GATEWAY_KEY }, ai };
  for (const group of DOCKER_GROUPS) {
    const compose = readFileSync(resolve(root, `backend/docker/${group}/compose.yml`), 'utf8');
    const names = [...new Set([...compose.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map(match => match[1]))].sort();
    // Rebuild from the allowlist: host-only and retired options never enter Docker env.
    entry(group).raw = '# Private local Docker configuration. Do not commit.\n';
    for (const key of names) if (values[group][key] !== undefined) setEnvironment(entry(group), key, values[group][key]);
  }
  const legacyFiles = Object.values(LEGACY_FILES).filter(file => existsSync(resolve(root, file)));
  return { entries, legacyFiles, sources: [host, ...legacyFiles.map(file => readEnvironment(file, root))] };
}

export function writeDockerEnvironments(plan, root = REPOSITORY_ROOT) {
  for (const source of plan.sources) {
    if (!existsSync(source.path) || readFileSync(source.path, 'utf8') !== source.original)
      throw new Error('Environment changed during preparation; no files were written.');
  }
  // Back up every input, including legacy files that will be retired.
  const backup = resolve(root, '.tmp/local-docker-env-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  const files = [...plan.legacyFiles, 'backend/ai-service/api/.env', ...plan.entries.filter(e => e.exists).map(e => e.relativePath)];
  for (const file of files) {
    const destination = resolve(backup, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(root, file), destination);
  }
  for (const entry of plan.entries) mkdirSync(dirname(entry.path), { recursive: true });
  const result = commitEnvironments(plan.entries, root);
  for (const file of plan.legacyFiles) unlinkSync(resolve(root, file));
  return { ...result, sourceBackupDirectory: backup };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--write')) throw new Error('Only --write is supported.');
    const plan = prepareDockerEnvironments();
    const changed = plan.entries.filter(e => e.raw !== e.original).map(e => e.relativePath);
    if (process.argv.includes('--write')) console.log(JSON.stringify(writeDockerEnvironments(plan), null, 2));
    else console.log(JSON.stringify({ mode: 'dry-run', changed, retired: plan.legacyFiles }, null, 2));
  } catch (error) {
    console.error(error instanceof Error && /^(Missing |[A-Z_]+:|Only --write)/.test(error.message) ? error.message : 'Docker env preparation failed; no values displayed.');
    process.exitCode = 1;
  }
}
