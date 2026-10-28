import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const steps = [
  { id: 'ai-build', cwd: 'backend/ai-service', args: ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'] },
  { id: 'ai-tests', cwd: 'backend/ai-service', args: ['--test', 'test/work-assistant.test.cjs'], needs: 'ai-build' },
  { id: 'project-types', cwd: 'backend/project-service', args: ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.build.json', '--noEmit', '--incremental', 'false'] },
  { id: 'project-tests', cwd: 'backend/project-service', args: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', 'src/modules/work-assistant/work-assistant.service.spec.ts', '--silent'] },
  { id: 'calendar-types', cwd: 'backend/calendar-service', args: ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.build.json', '--noEmit', '--incremental', 'false'] },
  { id: 'calendar-tests', cwd: 'backend/calendar-service', args: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', 'src/modules/work-assistant/work-assistant.service.spec.ts', '--silent'] },
  { id: 'frontend-types', cwd: 'frontend/web', args: ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'] },
  { id: 'frontend-tests', cwd: 'frontend/web', args: ['--test', 'scripts/work-assistant.test.mjs'] },
];
const startedAt = new Date().toISOString();
const results = [];
for (const step of steps) {
  if (step.needs && !results.find(result => result.id === step.needs)?.passed) {
    results.push({ id: step.id, passed: false, skipped: true, reason: 'Required build failed' });
    continue;
  }
  process.stdout.write('\nRunning ' + step.id + '\n');
  const start = performance.now();
  const run = spawnSync(process.execPath, step.args, {
    cwd: resolve(repo, step.cwd), encoding: 'utf8', timeout: 120000,
    env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true, maxBuffer: 8 * 1024 * 1024,
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  const output = (run.stdout ?? '') + (run.stderr ?? '');
  const nodeCount = /# tests (\d+)/.exec(output);
  const jestCount = /Tests:\s+(\d+) passed, (\d+) total/.exec(output);
  results.push({
    id: step.id, passed: run.status === 0 && !run.error, exitCode: run.status,
    durationMs: Math.round(performance.now() - start),
    ...(nodeCount ? { tests: Number(nodeCount[1]) } : jestCount ? { tests: Number(jestCount[2]) } : {}),
    ...(run.error ? { errorCode: run.error.code ?? 'PROCESS_ERROR' } : {}),
  });
}
const report = {
  startedAt, finishedAt: new Date().toISOString(),
  mode: 'isolated-fixtures-no-live-model',
  passed: results.every(result => result.passed),
  tests: results.reduce((count, result) => count + (result.tests ?? 0), 0),
  liveIntegration: { verified: false, reason: 'This runner uses isolated databases and fixtures. It does not call the deployed services or live model.' },
  steps: results,
};
const target = resolve(repo, 'docs/testing/work-assistant-test-results.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(report, null, 2) + '\n', 'utf8');
process.stdout.write('\n' + (report.passed ? 'PASS' : 'FAIL') + ': ' + report.tests + ' tests; report: docs/testing/work-assistant-test-results.json\n');
if (!report.passed) process.exitCode = 1;
