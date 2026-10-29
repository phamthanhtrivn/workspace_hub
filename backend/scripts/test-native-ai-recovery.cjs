const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const dir = path.resolve(root, '../.tmp/ai-native-stack');
const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json')));
const identity = JSON.parse(fs.readFileSync(path.join(dir, 'test-identities.json')));
const requireAi = createRequire(path.join(root, 'backend/ai-service/package.json'));
const { Pool } = requireAi('pg');
const { Queue } = requireAi('bullmq');
const databaseUrl = `postgresql://qa:${state.keys.pg}@127.0.0.1:${state.ports.pg}/ai_db`;
const db = new Pool({ connectionString: databaseUrl });
db.on('error', () => {});
const queue = new Queue('notebook-jobs', { prefix: 'wh-notebook', connection: { host: '127.0.0.1', port: state.ports.redis, password: state.keys.redis, maxRetriesPerRequest: 1 } });
queue.on('error', () => {});
const report = { runAt: new Date().toISOString(), scope: 'Only isolated QA resources; no production capacity or in-flight paid model crash certification', cases: [] };
const save = () => fs.writeFileSync(path.join(root, 'docs/testing/ai-comprehensive/native-recovery.json'), JSON.stringify(report, null, 2) + '\n');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run(id, fn) {
  const start = performance.now();
  try { await fn(); report.cases.push({ id, status: 'PASS', durationMs: Math.round(performance.now() - start) }); }
  catch (error) { report.cases.push({ id, status: 'FAIL', error: error.message }); throw error; }
  finally { save(); console.log(JSON.stringify(report.cases.at(-1))); }
}
async function request(method, url, body) {
  const res = await fetch(`http://127.0.0.1:${state.ports.kong}${url}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${identity.owner.accessToken}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  const text = await res.text(); assert.ok(res.ok, `${method} ${url}: ${res.status}`); return JSON.parse(text).data;
}
function stopQa(name) {
  const { pid } = JSON.parse(fs.readFileSync(path.join(dir, name + '.pid.json')));
  const check = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`], { encoding: 'utf8', windowsHide: true });
  assert.ok(check.stdout.includes(path.join(root, 'backend/ai-service').replaceAll('/', '\\')) || check.stdout.includes(path.join(root, 'backend/ai-service')), 'PID does not match QA AI service');
  process.kill(pid);
}
function startQa(name) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'bootstrap-native-ai-audit.cjs'), name], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, 'QA bootstrap failed');
}
function restartDocker(services) {
  const result = spawnSync('docker', ['compose', '-f', path.join(dir, 'compose.json'), 'restart', ...services], { windowsHide: true, encoding: 'utf8', timeout: 90000 });
  assert.equal(result.status, 0, 'Isolated Docker restart failed');
}
async function admission(owner, notebook, complete = false) {
  const code = `const {startChatRequest}=require('./dist/modules/chat/chat-request');const {db}=require('./dist/infrastructure/database/database');(async()=>{try{await startChatRequest(process.argv[1],process.argv[2],process.argv[3]);if(process.argv[4]==='true')await db.query("UPDATE notebook_ai.requests SET status='COMPLETED' WHERE id=$1",[process.argv[3]]);console.log(200)}catch(e){console.log(e.getStatus?.()||500);process.exitCode=e.getStatus?0:1}finally{await db.end()}})();`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', code, owner, notebook, randomUUID(), String(complete)], { cwd: path.join(root, 'backend/ai-service'), env: { ...process.env, DOTENV_CONFIG_PATH: 'test/no-env', DATABASE_URL: databaseUrl, AI_ENABLED: 'false', REDIS_URL: 'redis://127.0.0.1:16379', DOCUMENT_SERVICE_URL: 'http://127.0.0.1:18085', RAG_WORKER_URL: 'http://127.0.0.1:18088', LLM_BASE_URL: 'http://127.0.0.1:1', LLM_API_KEY: 'unused-admission-fixture', LLM_MODEL: 'unused' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', chunk => output += chunk); child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(Number(output.trim())) : reject(Error('Admission child failed')));
  });
}
(async () => {
  await run('postgres-admission-lock-across-independent-node-processes', async () => {
    const owner = randomUUID(), notebooks = Array.from({ length: 8 }, () => randomUUID());
    for (const id of notebooks) await db.query('INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$2,$3)', [id, owner, 'Distributed admission QA']);
    const results = await Promise.all(notebooks.map(id => admission(owner, id)));
    assert.equal(results.filter(code => code === 200).length, 2); assert.equal(results.filter(code => code === 429).length, 6);
    await db.query("UPDATE notebook_ai.requests SET status='COMPLETED' WHERE owner_id=$1", [owner]);
    for (let n = 0; n < 8; n++) assert.equal(await admission(owner, notebooks[0], true), 200);
    assert.equal(await admission(owner, notebooks[0], true), 429);
    const owner2 = randomUUID(), notebook2 = randomUUID();
    await db.query('INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$2,$3)', [notebook2, owner2, 'Unique active request QA']);
    assert.deepEqual((await Promise.all([admission(owner2, notebook2), admission(owner2, notebook2)])).sort(), [200, 409]);
    await db.query("UPDATE notebook_ai.requests SET status='CANCELLED' WHERE owner_id=$1", [owner2]);
    await db.query('DELETE FROM notebook_ai.notebooks WHERE owner_id=ANY($1::uuid[])', [[owner, owner2]]);
  });
  let jobId;
  await run('queue-job-survives-stopped-worker-and-redis-aof-restart', async () => {
    stopQa('jobs'); await pause(700);
    const notebook = await request('POST', '/api/ai/notebooks', { title: 'Queued cleanup recovery QA' });
    await request('DELETE', `/api/ai/notebooks/${notebook.id}`);
    jobId = `cleanup-${notebook.id}`;
    assert.equal(await (await queue.getJob(jobId)).getState(), 'waiting');
    await pause(1500); restartDocker(['redis']);
    for (let n = 0; n < 30; n++) {
      try { assert.equal(await (await queue.getJob(jobId)).getState(), 'waiting'); return; } catch { await pause(500); }
    }
    throw Error('AOF queued job was not recovered');
  });
  await run('postgres-qdrant-restart-preserves-chat-and-real-embedding-evidence', async () => {
    restartDocker(['pg', 'qdrant']);
    let recovered = false;
    for (let n = 0; n < 40; n++) {
      try {
        const notebook = await request('GET', `/api/ai/notebooks/${identity.notebookId}`);
        assert.ok(notebook.messages.some(item => item.role === 'ASSISTANT' && item.content.includes('108')));
        const res = await fetch(`http://127.0.0.1:${state.ports.rag}/retrieve`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-service-key': state.keys.rag }, body: JSON.stringify({ scopeId: identity.notebookId, sourceIds: [identity.sourceId], question: 'approved budget' }), signal: AbortSignal.timeout(10000) });
        assert.ok(res.ok); assert.ok((await res.json()).evidence.length); recovered = true; break;
      } catch { await pause(500); }
    }
    assert.ok(recovered);
  });
  await run('worker-restart-consumes-durable-cleanup-and-api-restart-keeps-history', async () => {
    startQa('jobs');
    let completed = false;
    for (let n = 0; n < 90; n++) {
      if (await (await queue.getJob(jobId)).getState() === 'completed') { completed = true; break; }
      await pause(500);
    }
    assert.ok(completed, 'Durable cleanup job not consumed');
    stopQa('ai'); await pause(700); startQa('ai');
    for (let n = 0; n < 40; n++) {
      try { const notebook = await request('GET', `/api/ai/notebooks/${identity.notebookId}`); assert.ok(notebook.messages.length && notebook.artifacts.some(a => a.status === 'COMPLETED')); return; }
      catch { await pause(500); }
    }
    throw Error('API did not recover persisted history');
  });
  report.passed = true;
})().catch(error => { report.passed = false; console.error(error.message); process.exitCode = 1; })
  .finally(async () => { startQa('jobs'); save(); await queue.close(); await db.end(); });
