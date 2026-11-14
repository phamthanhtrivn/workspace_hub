import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareDockerEnvironments } from './prepare-local-docker-env.mjs';
import { REPOSITORY_ROOT, parse } from './local-security/env-files.mjs';

export function validateDockerEnvironment({ root = REPOSITORY_ROOT } = {}) {
  const plan = prepareDockerEnvironments({ root });
  const errors = [];
  for (const entry of plan.entries) {
    if (!entry.exists) { errors.push({ file: entry.relativePath, code: 'missing_file' }); continue; }
    const actual = parse(entry.original), expected = parse(entry.raw);
    const seen = new Set();
    for (const match of entry.original.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)) {
      if (seen.has(match[1])) errors.push({ file: entry.relativePath, code: 'duplicate', variable: match[1] });
      seen.add(match[1]);
    }
    for (const key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
      if (actual[key] !== expected[key]) errors.push({ file: entry.relativePath, code: 'not_synchronized', variable: key });
    }
  }
  return { valid: errors.length === 0, errors, checked: plan.entries.map(entry => entry.relativePath) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = validateDockerEnvironment();
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } catch {
    console.error('Docker env validation failed; check input files and matching credentials. No values displayed.');
    process.exitCode = 1;
  }
}
