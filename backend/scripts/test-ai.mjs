import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const integration = process.argv.includes('--integration');
if (process.argv.slice(2).some(argument => argument !== '--integration')) {
  console.error('Usage: node backend/scripts/test-ai.mjs [--integration]');
  process.exitCode = 1;
} else {
  const tests = [
    'ai-cleanup', 'ai-deployment', 'notebook-frontend', 'notebook-migrate',
    'notebook-readiness', 'notebook-reliability', 'notebook-scope',
    'notebook-ui-cancel', 'notebook-workflow', 'conversation-language',
    'vision-parallel', 'vision-diagnostics', 'voice-transcript', 'provider-http',
    'work-assistant-frontend',
    ...(integration ? ['notebook-runtime.integration'] : []),
  ].map(name => `backend/security-tests/${name}.test.mjs`);
  async function run(program, arguments_) {
    await new Promise((resolve, reject) => {
      const child = spawn(program, arguments_, { cwd: root, windowsHide: true, stdio: 'inherit',
        env: { ...process.env, ...(integration ? { WORKSPACEHUB_AI_INTEGRATION: '1' } : {}) } });
      child.once('error', reject);
      child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${program} failed (${signal ?? code})`)));
    });
  }
  try {
    await run(process.execPath, ['--test', ...tests]);
    for (const file of ['rag_route_cleanup_test.py', 'rag_scope_deletion_test.py']) {
      await run(process.env.PYTHON || 'python', ['-B', `backend/security-tests/${file}`]);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
