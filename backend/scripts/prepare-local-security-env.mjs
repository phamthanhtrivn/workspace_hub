import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CALLER_CREDENTIALS, LOCAL_SERVICE_DIRECTORIES } from './local-security/contract.mjs';
import { REPOSITORY_ROOT, readEnvironment, parse, isPlaceholder, setEnvironment, unsetPlaceholder, commitEnvironments } from './local-security/env-files.mjs';

const usable = (value) => Boolean(value?.trim()) && !isPlaceholder(value);

export function prepareLocalEnvironments({ root = REPOSITORY_ROOT } = {}) {
  const inventory = JSON.parse(readFileSync(resolve(root, 'docs/local-env-contract.json'), 'utf8'));
  const entries = new Map(Object.keys(inventory.services).map((directory) => [directory, readEnvironment(`backend/${directory}/.env`, root)]));
  const service = (name) => entries.get(LOCAL_SERVICE_DIRECTORIES[name]);
  const warnings = [];
  const generated = [];
  const secretValues = new Set();
  for (const entry of entries.values()) {
    for (const [key, value] of Object.entries(entry.values)) {
      if (/KEY|SECRET|PASSWORD|TOKEN/.test(key) && usable(value)) secretValues.add(value);
    }
  }
  function pair(name, targets, aliases = []) {
    const keys = targets.map((target, index) => aliases[index] ?? name);
    const values = [...new Set(targets.map((target, index) => target.values[keys[index]]).filter(usable))];
    if (values.length > 1) throw new Error(`${name}: conflicting existing credentials; no files were written.`);
    let value = values[0];
    if (value && value.length < 32) throw new Error(`${name}: existing credential is shorter than 32 characters.`);
    if (!value) {
      do { value = randomBytes(32).toString('hex'); } while (secretValues.has(value));
      secretValues.add(value);
      generated.push(name);
    }
    targets.forEach((target, index) => setEnvironment(target, keys[index], value));
  }

  // Repair a pasted example overriding real storage/LiveKit credentials. Only
  // recover a value already present in this file AND independently matching the
  // configured receiver/storage peer; never invent provider credentials.
  const communication = service('communication');
  for (const key of ['AWS_S3_BUCKET_NAME', 'AWS_REGION', 'AWS_CLOUDFRONT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']) {
    const peer = key.startsWith('LIVEKIT_') ? entries.get('livekit') : service('user');
    const candidates = communication.raw.split(/\r?\n/).map((line) => parse(line)[key]).filter(usable);
    const recoverable = candidates.find((value) => value === peer.values[key]);
    if (recoverable) setEnvironment(communication, key, recoverable);
    else if (!usable(communication.values[key])) throw new Error(`communication-service: ${key} needs an existing valid value.`);
  }
  // Keep one effective assignment for duplicate keys, preserving other values.
  for (const [key, value] of Object.entries(communication.values)) setEnvironment(communication, key, value);

  for (const edge of CALLER_CREDENTIALS) pair(edge.name, [service(edge.caller), service(edge.receiver)]);
  const edgeValues = new Set();
  for (const edge of CALLER_CREDENTIALS) {
    const value = service(edge.caller).values[edge.name];
    if (edgeValues.has(value)) throw new Error(`${edge.name}: caller credentials must be distinct.`);
    edgeValues.add(value);
    for (const entry of entries.values()) {
      if (entry !== service(edge.caller) && entry !== service(edge.receiver) && Object.hasOwn(entry.values, edge.name))
        throw new Error(`${edge.name}: credential is configured at an unrelated service.`);
      if (Object.entries(entry.values).some(([name, configured]) => name !== edge.name && /KEY|SECRET|TOKEN|PASSWORD/.test(name) && configured === value))
        throw new Error(`${edge.name}: credential is reused for another purpose.`);
    }
  }
  pair('CALENDAR_DOCUMENT_SERVICE_KEY', [service('calendar'), service('document')]);
  pair('AI_GATEWAY_KEY', [service('ai'), entries.get('kong-gateway')]);
  pair('AI_DOCUMENT_SERVICE_KEY', [service('ai'), service('document')]);
  pair('RAG_SERVICE_KEY', [service('ai'), entries.get('ai-service/rag-worker')]);
  pair('MEETING_STT_SERVICE_KEY', [service('ai'), entries.get('ai-service/speech-worker')], ['MEETING_STT_SERVICE_KEY', 'SPEECH_SERVICE_KEY']);

  for (const entry of entries.values()) {
    for (const key of Object.keys(entry.values)) {
      if (key.endsWith('_PREVIOUS')) unsetPlaceholder(entry, key);
    }
  }
  unsetPlaceholder(communication, 'APTION_SERVICE_URL');
  if (!service('calendar').values.FRONTEND_URL) setEnvironment(service('calendar'), 'FRONTEND_URL', service('ai').values.FRONTEND_URL);
  const speech = entries.get('ai-service/speech-worker');
  for (const [key, value] of Object.entries({ STT_CPU_THREADS: service('ai').values.MEETING_STT_CPU_THREADS ?? '4', STT_MODEL_PATH: service('ai').values.MEETING_STT_MODEL_PATH ?? 'models/small' })) {
    if (!speech.original || !speech.values[key]) setEnvironment(speech, key, value);
  }
  for (const entry of entries.values()) {
    for (const [key, value] of Object.entries(entry.values)) {
      if (isPlaceholder(value)) throw new Error(`${entry.relativePath}: active placeholder ${key}; no files were written.`);
    }
  }
  const ai = service('ai').values;
  for (const flag of ['CONVERSATION_AI_ENABLED', 'MEETING_SUMMARY_ENABLED']) {
    if (ai[flag] !== communication.values[flag]) warnings.push(`${flag} differs between AI and Communication; existing feature flags were preserved.`);
  }
  if (!service('notification').values.WEB_PUSH_ALLOWED_HOSTS) warnings.push('WEB_PUSH_ALLOWED_HOSTS needs the actual supported push-provider hostnames.');
  return { entries: [...entries.values()], generated, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.slice(2).some((arg) => !['--write'].includes(arg))) throw new Error('Only --write is supported; legacy credentials are no longer generated.');
    const plan = prepareLocalEnvironments();
    if (process.argv.includes('--write')) {
      console.log(JSON.stringify({ ...commitEnvironments(plan.entries), generated: plan.generated, warnings: plan.warnings }, null, 2));
    } else {
      console.log(JSON.stringify({ mode: 'dry-run', changed: plan.entries.filter((entry) => entry.raw !== entry.original).map((entry) => entry.relativePath), generated: plan.generated, warnings: plan.warnings }, null, 2));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Local environment preparation failed; values were not displayed.');
    process.exitCode = 1;
  }
}
