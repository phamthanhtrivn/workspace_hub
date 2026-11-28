import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const enabled = process.env.WORKSPACEHUB_GATEWAY_DNS_INTEGRATION === '1';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function docker(args) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  // config output may contain private env. Never attach stdout/stderr to an error.
  if (result.status !== 0) {
    // Only run's arguments contain synthetic settings; never expose Compose/inspect output.
    const detail = args[0] === 'run'
      ? result.stderr.replace(/https?:\/\/\S+/g, '[url]').slice(0, 700)
      : '';
    throw new Error(`Docker ${args[0]} failed during isolated DNS verification${detail ? ': ' + detail : ''}`);
  }
  return result.stdout.trim();
}

test('local Kong recovers after a stopped API returns with a different IP without proxy retries', {
  skip: !enabled,
  timeout: 150000,
}, async () => {
  const runId = randomUUID().slice(0, 8);
  const prefix = `wh-dns-test-${runId}`;
  const network = `${prefix}-network`;
  const gateway = `${prefix}-kong`;
  const first = `${prefix}-first`;
  const second = `${prefix}-second`;
  const blocker = `${prefix}-blocker`;
  const label = 'workspacehub.dns-test';
  const temporaryRoot = resolve(root, '.tmp');
  mkdirSync(temporaryRoot, { recursive: true });
  const directory = mkdtempSync(resolve(temporaryRoot, 'gateway-dns-'));
  const configPath = resolve(directory, 'kong.yml');
  const resourceHasLabel = (kind, name) => {
    try {
      const details = JSON.parse(docker([kind === 'network' ? 'network' : 'container', 'inspect', name]))[0];
      return (kind === 'network' ? details.Labels : details.Config.Labels)?.[label] === runId;
    } catch { return false; }
  };
  try {
    const model = JSON.parse(docker(['compose', '-f', 'backend/docker/compose.yml', 'config', '--format', 'json']));
    const dns = Object.entries(model.services.kong.environment).filter(([name]) => name.startsWith('KONG_DNS_'));
    assert.equal(dns.length, 4, 'Use the actual local gateway DNS policy');
    // Container .Image can be a config digest that the Desktop image store cannot run directly.
    const cachedImage = container => docker(['image', 'inspect', '--format', '{{.Id}}',
      docker(['inspect', '--format', '{{.Config.Image}}', container])]);
    const nodeImage = cachedImage('docker-notebook-api-1');
    const gatewayImage = cachedImage('wh_kong');
    writeFileSync(configPath, '_format_version: "3.0"\nservices:\n  - name: fixture\n    url: http://ai-fixture:8087\n    retries: 0\n    routes:\n      - name: probe\n        paths: [/probe]\n');
    docker(['network', 'create', '--label', `${label}=${runId}`, network]);
    const backend = (name, marker, extra = []) => docker([
      'run', '-d', '--pull', 'never', '--name', name, '--label', `${label}=${runId}`,
      '--network', network, '--memory', '128m', ...extra, nodeImage,
      'node', '-e', `require('node:http').createServer((_,r)=>r.end(${JSON.stringify(marker)})).listen(8087,'0.0.0.0')`,
    ]);
    backend(first, 'first', ['--network-alias', 'ai-fixture']);
    docker([
      'run', '-d', '--pull', 'never', '--name', gateway, '--label', `${label}=${runId}`,
      '--network', network, '--memory', '512m', '--cpus', '1',
      '--mount', `type=bind,source=${configPath},target=/usr/local/kong/declarative/kong.template.yml,readonly`,
      '-e', 'KONG_PLUGINS=bundled', '-e', 'KONG_NGINX_WORKER_PROCESSES=1',
      '-e', 'KONG_ADMIN_LISTEN=off', '-e', 'JWT_SECRET_KEY=test-only-not-an-account-key',
      '-e', 'FRONTEND_URL=http://fixture.invalid',
      ...dns.flatMap(([key, value]) => ['-e', `${key}=${value}`]), gatewayImage,
    ]);
    const probe = () => docker(['exec', gateway, 'resty', '-e',
      'local h=require("socket.http");h.TIMEOUT=2;local b,c=h.request("http://127.0.0.1:8000/probe");print(c);print(b or "")']);
    const waitFor = async (marker, timeout) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        try { if (probe().startsWith(`200\n${marker}`)) return; } catch { /* gateway may be starting */ }
        await delay(250);
      }
      assert.fail(`Isolated gateway did not recover to ${marker}`);
    };
    await waitFor('first', 30000);
    const oldIP = docker(['inspect', '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', first]);
    assert.ok(resourceHasLabel('container', first));
    docker(['rm', '-f', '-v', first]);
    // Occupy the former address without a listener, reproducing its reassignment to a jobs process.
    docker(['run', '-d', '--pull', 'never', '--name', blocker, '--label', `${label}=${runId}`,
      '--network', network, '--ip', oldIP, '--memory', '128m', nodeImage, 'node', '-e', 'setInterval(()=>{},1000)']);
    assert.ok(!probe().startsWith('200\n'), 'An unavailable backend must not look successful');
    backend(second, 'second', ['--network-alias', 'ai-fixture']);
    const newIP = docker(['inspect', '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', second]);
    assert.notEqual(newIP, oldIP);
    await waitFor('second', 15000);
  } finally {
    for (const name of [gateway, first, second, blocker]) {
      if (resourceHasLabel('container', name)) docker(['rm', '-f', '-v', name]);
    }
    if (resourceHasLabel('network', network)) docker(['network', 'rm', network]);
    assert.equal(dirname(directory), temporaryRoot);
    assert.ok(basename(directory).startsWith('gateway-dns-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
