import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CALLER_CREDENTIALS, LOCAL_SERVICE_DIRECTORIES } from './local-security/contract.mjs';
import { REPOSITORY_ROOT, isPlaceholder, parse, readEnvironment } from './local-security/env-files.mjs';

const manifestPath = 'docs/local-env-contract.json';
const databaseNames = {
  user: 'user_db', project: 'project_db', communication: 'communication_db',
  document: 'document_db', calendar: 'calendar_db', notification: 'notification_db', ai: 'notebook_db',
};
const dedicated = [
  ['AI_GATEWAY_KEY', 'ai-service', 'kong-gateway'],
  ['AI_DOCUMENT_SERVICE_KEY', 'ai-service', 'document-service'],
  ['RAG_SERVICE_KEY', 'ai-service', 'rag-worker'],
  ['CALENDAR_DOCUMENT_SERVICE_KEY', 'calendar-service', 'document-service'],
  ['MEETING_STT_SERVICE_KEY', 'ai-service', 'speech-worker', 'SPEECH_SERVICE_KEY'],
];

function duplicateNames(raw) {
  const seen = new Set(), duplicates = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/.exec(line);
    if (!match) continue;
    if (seen.has(match[1])) duplicates.add(match[1]);
    seen.add(match[1]);
  }
  return [...duplicates];
}

export function validateLocalEnvironment({ root = REPOSITORY_ROOT } = {}) {
  const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
  const errors = [];
  const entries = new Map();
  const error = (service, category, name) => errors.push({ service, category, name });
  for (const [service, spec] of Object.entries(manifest.services)) {
    const entry = readEnvironment(`backend/${service}/.env`, root);
    entries.set(service, entry);
    if (!entry.exists) { error(service, 'missing_file', '.env'); continue; }
    const allowed = new Set(Object.keys(spec.current_variables));
    for (const name of duplicateNames(entry.raw)) error(service, 'duplicate', name);
    for (const [name, value] of Object.entries(entry.values)) {
      if (!allowed.has(name)) error(service, 'unused_or_unclassified', name);
      if (isPlaceholder(value)) error(service, 'placeholder', name);
    }
    for (const [name, meta] of Object.entries(spec.variables)) {
      if (meta.requiredLocal && !entry.values[name]) error(service, 'missing', name);
    }
    for (const [name, references] of Object.entries(spec.current_variables)) {
      const proven = references.some((reference) => {
        const source = resolve(root, reference.replace(/:\d+$/, ''));
        return existsSync(source) && readFileSync(source, 'utf8').includes(name);
      });
      if (!proven) error(service, 'reader_not_found', name);
    }
  }
  const values = (service) => entries.get(service)?.values ?? {};
  const configuredAt = (name) => [...entries].filter(([, entry]) => Object.hasOwn(entry.values, name)).map(([service]) => service).sort();
  const allKeys = new Set();
  for (const edge of CALLER_CREDENTIALS) {
    const caller = LOCAL_SERVICE_DIRECTORIES[edge.caller], receiver = LOCAL_SERVICE_DIRECTORIES[edge.receiver];
    const actual = configuredAt(edge.name), expected = [caller, receiver].sort();
    if (actual.join(',') !== expected.join(',')) error(edge.name, 'placement', edge.name);
    const value = values(caller)[edge.name];
    if (!value || value.length < 32 || value !== values(receiver)[edge.name]) error(edge.name, 'mismatch_or_short', edge.name);
    if (allKeys.has(value)) error(edge.name, 'reused_secret', edge.name);
    if (value) allKeys.add(value);
  }
  for (const [name, first, second, secondName = name] of dedicated) {
    const value = values(first)[name];
    if (!value || value.length < 32 || value !== values(second)[secondName]) error(name, 'mismatch_or_short', name);
    if (secondName === name && configuredAt(name).join(',') !== [first, second].sort().join(',')) error(name, 'placement', name);
    if (allKeys.has(value)) error(name, 'reused_secret', name);
    if (value) allKeys.add(value);
  }
  const jwt = values('user-service').JWT_SECRET_KEY;
  for (const service of ['project-service', 'communication-service', 'document-service', 'calendar-service', 'notification-service']) {
    if (!jwt || values(service).JWT_SECRET_KEY !== jwt) error(service, 'jwt_mismatch', 'JWT_SECRET_KEY');
  }
  for (const [name, directory] of Object.entries(LOCAL_SERVICE_DIRECTORIES)) {
    const env = values(directory);
    if (name === 'user') {
      if (env.POSTGRES_USERNAME !== 'wh_user' || env.POSTGRES_DB !== databaseNames.user) error(directory, 'runtime_role_or_database', 'POSTGRES_USERNAME');
      continue;
    }
    try {
      const url = new URL(env.DATABASE_URL);
      if (decodeURIComponent(url.username) !== `wh_${name}` || decodeURIComponent(url.pathname.slice(1)) !== databaseNames[name]
        || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) error(directory, 'runtime_role_or_database', 'DATABASE_URL');
    } catch { error(directory, 'invalid_url', 'DATABASE_URL'); }
  }
  for (const file of ['frontend/web/.env', 'frontend/web/.env.docker']) {
    const path = resolve(root, file);
    if (!existsSync(path)) { error(file, 'missing_file', file); continue; }
    const raw = readFileSync(path, 'utf8'), env = parse(raw);
    for (const name of duplicateNames(raw)) error(file, 'duplicate', name);
    for (const [name, value] of Object.entries(env)) {
      if (!manifest.frontend.variables.includes(name)) error(file, 'unused_or_unclassified', name);
      if (isPlaceholder(value)) error(file, 'placeholder', name);
    }
    for (const name of manifest.frontend.variables.filter((name) => name.startsWith('NEXT_PUBLIC_'))) {
      if (!env[name]) error(file, 'missing', name);
    }
  }
  return { valid: errors.length === 0, errors, checked: [...entries.keys(), 'frontend/web/.env', 'frontend/web/.env.docker'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = validateLocalEnvironment();
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } catch {
    console.error('Local env validation could not finish; no values displayed.');
    process.exitCode = 1;
  }
}
