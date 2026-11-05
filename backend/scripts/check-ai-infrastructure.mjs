import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../ai-service/package.json', import.meta.url));
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
  }
  for (const key of ['POSTGRES_PASSWORD', 'POSTGRES_USER', 'PGPASSWORD']) {
    if (key in env) invalid.add(key);
  }
  try {
    const db = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(db.protocol) || db.pathname !== '/notebook_db'
      || decodeURIComponent(db.username) !== (deploymentContract ? env.NOTEBOOK_POSTGRES_USER : 'wh_ai')
      || (deploymentContract && decodeURIComponent(db.password) !== env.NOTEBOOK_POSTGRES_PASSWORD)
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
  for (const flag of ['AI_ENABLED', 'CONVERSATION_AI_ENABLED', 'WORK_ASSISTANT_ENABLED', 'MEETING_SUMMARY_ENABLED', 'VISUAL_ENABLED']) {
    if (env[flag] && !['true', 'false'].includes(env[flag])) invalid.add(flag);
  }
  for (const key of ['AI_GATEWAY_KEY', 'AI_DOCUMENT_SERVICE_KEY', 'RAG_SERVICE_KEY']) requireKey(key);
  if (production || env.AI_ENABLED === 'true') {
    for (const key of ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL']) requireValue(key);
  }
  if (deploymentContract) {
    if (production || env.CONVERSATION_AI_ENABLED === 'true' || env.MEETING_SUMMARY_ENABLED === 'true') requireKey('AI_COMMUNICATION_SERVICE_KEY');
    if (production || env.WORK_ASSISTANT_ENABLED === 'true') requireKey('WORK_ASSISTANT_SERVICE_KEY');
  } else {
    requireKey('AI_TO_USER_KEY');
    if (env.CONVERSATION_AI_ENABLED === 'true' || env.MEETING_SUMMARY_ENABLED === 'true') {
      requireKey('AI_TO_COMMUNICATION_KEY');
      requireKey('COMMUNICATION_TO_AI_KEY');
    }
    if (env.WORK_ASSISTANT_ENABLED === 'true') {
      requireKey('AI_TO_PROJECT_KEY');
      requireKey('AI_TO_CALENDAR_KEY');
    }
  }
  if (production || env.MEETING_SUMMARY_ENABLED === 'true') requireKey('MEETING_STT_SERVICE_KEY');
  const keys = ['AI_GATEWAY_KEY', 'AI_DOCUMENT_SERVICE_KEY', 'RAG_SERVICE_KEY', 'MEETING_STT_SERVICE_KEY',
    ...(deploymentContract ? ['AI_COMMUNICATION_SERVICE_KEY', 'WORK_ASSISTANT_SERVICE_KEY'] :
      ['AI_TO_USER_KEY', 'AI_TO_COMMUNICATION_KEY', 'COMMUNICATION_TO_AI_KEY', 'AI_TO_PROJECT_KEY', 'AI_TO_CALENDAR_KEY'])];
  const configured = keys.filter(key => env[key]);
  if (new Set(configured.map(key => env[key])).size !== configured.length) invalid.add('distinct service keys');
  if (production) {
    if (env.NODE_ENV !== 'production') invalid.add('NODE_ENV');
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
