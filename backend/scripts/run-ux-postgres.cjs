const { spawnSync } = require('node:child_process');
const path = require('node:path');
const argumentsToRun = process.argv.slice(2);
const nodeTests = argumentsToRun[0] === '--node';
if (nodeTests) argumentsToRun.shift();
const args = nodeTests ? ['--test', ...argumentsToRun] : [path.join(process.cwd(), 'node_modules/jest/bin/jest.js'), '--runInBand', '--testTimeout=30000', ...argumentsToRun];
const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, TEST_UX_POSTGRES: 'true' }, stdio: 'inherit', windowsHide: true });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
