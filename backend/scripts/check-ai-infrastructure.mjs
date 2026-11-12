import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
const { parse } = require('dotenv');
const immutableImage = /(?:@sha256:[a-f0-9]{64}|:sha-[a-f0-9]{40})$/;

// Report parameter names only: URLs and parser errors can contain credentials.
export function validateInfrastructure(env, production = false) {
  const invalid = new Set();
  const requireValue = (key) => { if (!env[key]?.trim()) invalid.add(key); };
  const requireKey = (key) => { if ((env[key]?.trim().length ?? 0) < 32) invalid.add(key); };
  const deploymentContract = production || env.NOTEBOOK_POSTGRES_USER === 'notebook';
  if (deploymentContract) {
    if (env.NOTEBOOK_POSTGRES_USER !== 'notebook') invalid.add('NOTEBOOK_POSTGRES_USER');
    requireKey('NOTEBOOK_POSTGRES_PASSWORD');
  } else if (env.NOTEBOOK_POSTGRES_USER && env.NOTEBOOK_POSTGRES_USER !== 'postgres') {
    invalid.add('NOTEBOOK_POSTGRES_USER');
  }
  for (const key of ['POSTGRES_PASSWORD', 'POSTGRES_USER', 'PGPASSWORD']) {
    if (key in env) invalid.add(key);
  }
  try {
    const db = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(db.protocol) || db.pathname !== '/notebook_db'
      || (deploymentContract ? decodeURIComponent(db.username) !== env.NOTEBOOK_POSTGRES_USER
        : !['postgres', 'wh_ai'].includes(decodeURIComponent(db.username)))
      || (deploymentContract && decodeURIComponent(db.password) !== env.NOTEBOOK_POSTGRES_PASSWORD)
      || (!deploymentContract && env.NOTEBOOK_POSTGRES_USER && decodeURIComponent(db.username) !== env.NOTEBOOK_POSTGRES_USER)
      || (!deploymentContract && env.NOTEBOOK_POSTGRES_PASSWORD && decodeURIComponent(db.password) !== env.NOTEBOOK_POSTGRES_PASSWORD)
      || (!deploymentContract && !db.password)
      || (production && ['localhost', '127.0.0.1', 'host.docker.internal'].includes(db.hostname))) {
      invalid.add('DATABASE_URL');
    }
  } catch { invalid.add('DATABASE_URL'); }
  try {
    const redis = new URL(env.REDIS_URL);
    if (!['redis:', 'rediss:'].includes(redis.protocol) || (deploymentContract && redis.pathname !== '/3')
      || (production && ['localhost', '127.0.0.1', 'host.docker.internal'].includes(redis.hostname))) {
      invalid.add('REDIS_URL');
    }
  } catch { invalid.add('REDIS_URL'); }
  for (const flag of ['AI_ENABLED', 'CONVERSATION_AI_ENABLED', 'WORK_ASSISTANT_ENABLED', 'MEETING_SUMMARY_ENABLED', 'VOICE_TRANSCRIPTION_ENABLED', 'VISUAL_ENABLED', 'EMBEDDING_LOCAL_ENABLED']) {
    if (env[flag] !== undefined && !['true', 'false'].includes(env[flag])) invalid.add(flag);
  }
  const speechEnabled = env.MEETING_SUMMARY_ENABLED === 'true'
    || (env.VOICE_TRANSCRIPTION_ENABLED ?? env.MEETING_SUMMARY_ENABLED) === 'true';
  const embeddingProvider = env.EMBEDDING_PROVIDER ?? 'local';
  if (!['local', 'api', 'gemini'].includes(embeddingProvider)) invalid.add('EMBEDDING_PROVIDER');
  if (!['ensemble', 'shard'].includes(env.EMBEDDING_INDEX_STRATEGY ?? 'ensemble')) invalid.add('EMBEDDING_INDEX_STRATEGY');
  if ((embeddingProvider === 'api' && production) || embeddingProvider === 'gemini') {
    requireValue('EMBEDDING_MODEL');
    requireValue('EMBEDDING_API_KEY');
  }
  if (embeddingProvider === 'api') {
    try {
      const url = new URL(env.EMBEDDING_BASE_URL);
      const trustedLocal = !production && url.protocol === 'http:' && url.hostname === 'host.docker.internal' && url.port;
      if ((url.protocol !== 'https:' && !trustedLocal) || url.username || url.password || url.search || url.hash) invalid.add('EMBEDDING_BASE_URL');
    } catch { invalid.add('EMBEDDING_BASE_URL'); }
  }
  if (embeddingProvider === 'gemini') {
    if (!['gemini-embedding-001', 'gemini-embedding-2'].includes(env.EMBEDDING_MODEL)) invalid.add('EMBEDDING_MODEL');
    if (![768, 1536, 3072].includes(Number(env.EMBEDDING_DIMENSIONS ?? 768))) invalid.add('EMBEDDING_DIMENSIONS');
  }
  if (env.EMBEDDING_LOCAL_ENABLED === 'true' || env.EMBEDDING_SECONDARY_MODEL) {
    if (embeddingProvider !== 'gemini') invalid.add('EMBEDDING_PROVIDER');
    if (env.EMBEDDING_SECONDARY_MODEL && (!['gemini-embedding-001', 'gemini-embedding-2'].includes(env.EMBEDDING_SECONDARY_MODEL)
      || env.EMBEDDING_SECONDARY_MODEL === env.EMBEDDING_MODEL)) invalid.add('EMBEDDING_SECONDARY_MODEL');
  }
  for (const key of ['AI_GATEWAY_KEY', 'AI_DOCUMENT_SERVICE_KEY', 'RAG_SERVICE_KEY']) requireKey(key);
  if (production || env.AI_ENABLED === 'true') {
    for (const key of ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL']) requireValue(key);
  }
  requireKey('AI_TO_USER_KEY');
  if (env.CONVERSATION_AI_ENABLED === 'true' || speechEnabled) {
    requireKey('AI_TO_COMMUNICATION_KEY');
    requireKey('COMMUNICATION_TO_AI_KEY');
  }
  if (env.WORK_ASSISTANT_ENABLED === 'true') {
    requireKey('AI_TO_PROJECT_KEY');
    requireKey('AI_TO_CALENDAR_KEY');
  }
  if (production || speechEnabled) requireKey('MEETING_STT_SERVICE_KEY');
  if (speechEnabled) requireValue('MEETING_MEDIA_HOSTS');
  const keys = ['AI_GATEWAY_KEY', 'AI_DOCUMENT_SERVICE_KEY', 'RAG_SERVICE_KEY', 'MEETING_STT_SERVICE_KEY',
    'AI_TO_USER_KEY', 'AI_TO_COMMUNICATION_KEY', 'COMMUNICATION_TO_AI_KEY', 'AI_TO_PROJECT_KEY', 'AI_TO_CALENDAR_KEY'];
  const configured = keys.filter(key => env[key]);
  if (new Set(configured.map(key => env[key])).size !== configured.length) invalid.add('distinct service keys');
  if (production) {
    if (env.NODE_ENV !== 'production') invalid.add('NODE_ENV');
    requireKey('JWT_SECRET_KEY');
    requireValue('JWT_ISSUER');
    const serviceUrls = ['FRONTEND_URL', 'USER_SERVICE_URL', 'DOCUMENT_SERVICE_URL', 'RAG_WORKER_URL',
      ...(env.CONVERSATION_AI_ENABLED === 'true' || speechEnabled ? ['COMMUNICATION_SERVICE_URL'] : []),
      ...(speechEnabled ? ['MEETING_STT_URL'] : []),
      ...(env.WORK_ASSISTANT_ENABLED === 'true' ? ['WORK_ASSISTANT_PROJECT_URL', 'WORK_ASSISTANT_CALENDAR_URL'] : [])];
    for (const key of serviceUrls) {
      try {
        const url = new URL(env[key]);
        if (!['http:', 'https:'].includes(url.protocol)
          || ['localhost', '127.0.0.1', 'host.docker.internal', '::1', '[::1]'].includes(url.hostname)
          || (key === 'FRONTEND_URL' && url.protocol !== 'https:')) invalid.add(key);
      } catch { invalid.add(key); }
    }
    if (env.BIND_HOST && env.BIND_HOST !== '0.0.0.0') invalid.add('BIND_HOST');
    if (speechEnabled && !(env.COMPOSE_PROFILES ?? '').split(',').map(value => value.trim()).includes('meeting-summary'))
      invalid.add('COMPOSE_PROFILES');
    for (const key of ['AI_IMAGE', 'RAG_IMAGE', 'SPEECH_IMAGE']) {
      if (!immutableImage.test(env[key] ?? '')) invalid.add(key);
    }
  }
  return [...invalid].sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const envIndex = args.indexOf('--env');
  if (envIndex < 0 || !args[envIndex + 1]) {
    console.error('Usage: node backend/scripts/check-ai-infrastructure.mjs --env <file> [--production]');
    process.exitCode = 1;
  } else {
    try {
      const invalid = validateInfrastructure(parse(fs.readFileSync(args[envIndex + 1])), args.includes('--production'));
      if (invalid.length) {
        console.error('Invalid or missing AI parameters: ' + invalid.join(', '));
        process.exitCode = 1;
      } else console.log('AI infrastructure configuration is valid; secrets were not displayed.');
    } catch {
      console.error('Cannot read AI env file.');
      process.exitCode = 1;
    }
  }
}
