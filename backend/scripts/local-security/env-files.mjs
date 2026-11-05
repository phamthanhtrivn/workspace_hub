import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(resolve(REPOSITORY_ROOT, 'backend/ai-service/package.json'));
export const { parse } = require('dotenv');
export const isPlaceholder = (value = '') => /REPLACE_|replace-with-|ci-placeholder|^(?:changeme|change[-_]?me|your[-_].*|example|secret)$/i.test(value);

export function readEnvironment(relativePath, root = REPOSITORY_ROOT) {
  const path = resolve(root, relativePath);
  const exists = existsSync(path);
  const original = exists ? readFileSync(path, 'utf8') : '';
  return { relativePath, path, exists, original, raw: original, values: parse(original) };
}

function serialize(value) {
  const text = String(value);
  if (!/[\s#'"`]/.test(text)) return text;
  for (const quote of ["'", '"', '`']) {
    if (!text.includes(quote) && !/[\r\n]/.test(text)) return quote + text + quote;
  }
  throw new Error('Cannot safely serialize an environment value; values were not displayed.');
}

export function setEnvironment(entry, key, value) {
  const newline = entry.raw.includes('\r\n') ? '\r\n' : '\n';
  const assignment = `${key}=${serialize(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`);
  let found = false;
  const lines = entry.raw.split(/\r?\n/).filter((line) => {
    if (!pattern.test(line)) return true;
    if (found) return false;
    found = true;
    return true;
  }).map((line) => pattern.test(line) ? assignment : line);
  entry.raw = lines.join(newline);
  if (!found) entry.raw += (entry.raw && !entry.raw.endsWith('\n') ? newline : '') + assignment + newline;
  entry.values = parse(entry.raw);
}

export function removeEnvironment(entry, key) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error('Invalid environment variable name.');
  const newline = entry.raw.includes('\r\n') ? '\r\n' : '\n';
  const assignment = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
  entry.raw = entry.raw.split(/\r?\n/).filter((line) => !assignment.test(line)).join(newline);
  entry.values = parse(entry.raw);
}

export function unsetPlaceholder(entry, key) {
  if (!isPlaceholder(entry.values[key])) return;
  const pattern = new RegExp(`^(\\s*(?:export\\s+)?)${key}\\s*=.*$`, 'gm');
  entry.raw = entry.raw.replace(pattern, `# ${key}: unset; no active rotation or provider configured.`);
  entry.values = parse(entry.raw);
}

export function commitEnvironments(entries, root = REPOSITORY_ROOT) {
  const changed = entries.filter((entry) => entry.raw !== entry.original);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirectory = resolve(root, '.tmp/security-env-backups', stamp);
  // Validate the entire plan before writing. Refuse to overwrite concurrent edits.
  for (const entry of changed) {
    if (existsSync(entry.path) !== entry.exists || (entry.exists && readFileSync(entry.path, 'utf8') !== entry.original)) {
      throw new Error(`Environment changed during preparation: ${entry.relativePath}`);
    }
  }
  if (!changed.length) return { changed: [], backupDirectory: undefined };
  mkdirSync(backupDirectory, { recursive: true });
  const staged = [];
  const written = [];
  try {
    for (const entry of changed) {
      if (entry.exists) {
        const backup = resolve(backupDirectory, entry.relativePath);
        mkdirSync(dirname(backup), { recursive: true });
        writeFileSync(backup, entry.original, { flag: 'wx', mode: 0o600 });
      }
      const stage = entry.path + '.security-preparing';
      writeFileSync(stage, entry.raw, { flag: 'wx', mode: 0o600 });
      staged.push(stage);
    }
    for (const entry of changed) {
      // Recheck immediately before replacing each file.
      if (existsSync(entry.path) !== entry.exists || (entry.exists && readFileSync(entry.path, 'utf8') !== entry.original)) {
        throw new Error(`Environment changed during preparation: ${entry.relativePath}`);
      }
      renameSync(entry.path + '.security-preparing', entry.path);
      written.push(entry);
    }
  } catch (error) {
    for (const entry of written.reverse()) {
      if (entry.exists) writeFileSync(entry.path, entry.original, { mode: 0o600 });
      else if (existsSync(entry.path)) unlinkSync(entry.path);
    }
    throw error;
  } finally {
    for (const stage of staged) if (existsSync(stage)) unlinkSync(stage);
  }
  return { changed: changed.map((entry) => entry.relativePath), backupDirectory };
}

export function fingerprint(value) {
  return createHash('sha256').update(value).digest('hex');
}
