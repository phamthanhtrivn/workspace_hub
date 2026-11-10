// Opt-in acceptance run: real compiled API, PostgreSQL/Redis and browser; synthetic users/work data.
// Add --live-model for exactly one additional request to the configured provider using only fixture data.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ai = createRequire(resolve(root, 'backend/ai-service/api/package.json'));
const web = createRequire(resolve(root, 'frontend/web/package.json'));
const out = resolve(process.env.TEMP || root, 'workspacehub-work-assistant-runtime');
const runId = 'wh-work-runtime-' + randomBytes(5).toString('hex');
const containers = [], children = [], reports = [], modelInputs = [];
const actorId = randomUUID(), projectId = randomUUID(), taskId = randomUUID(), sessionId = randomUUID();
const email = 'runtime-fixture@example.test', secret = randomBytes(32).toString('hex');
let db, browser, server, mode = 'normal', phase = 'setup', liveCalls = 0, providerEnv;
const now = new Date().toISOString();
const metrics = { open: 1, overdue: 0, dueToday: 1, completedInPeriod: 0, completedWithDeadline: 0, onTime: 0, late: 0, onTimeRate: null, deadlineBasis: 'current stored deadline' };
const task = { id: taskId, kind: 'project', projectId, project: 'Runtime fixture', title: 'Runtime smoke task', description: 'Verify streaming with synthetic data.', priority: 'HIGH', status: 'TODO',
  dueAt: now, allDay: false, overdue: false, dueToday: true, url: `/projects/${projectId}?taskId=${taskId}`, checklist: [], checklistCount: 0, childCount: 0, blockedBy: [], unblocks: 0 };
function stage(value) { phase = value; console.log(JSON.stringify({ phase })); }
async function command(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.on('data', part => { text += part; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(text.trim()) : reject(new Error('Runtime command failed: ' + program)));
  });
}
async function port() {
  const server = netServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
async function until(check, name, limit = 60000) {
  const end = Date.now() + limit;
  while (Date.now() < end) {
    try { if (await check()) return; } catch { /* Startup is polled without provider retries. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Timed out: ' + name);
}
function start(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  child.stdout.on('data', part => {
    for (const line of part.toString().split('\n')) {
      try { const item = JSON.parse(line); if (item.event === 'ai_pipeline') reports.push(item); } catch { /* Ignore framework startup output. */ }
    }
  });
  child.stderr.on('data', () => {});
  return child;
}
function jwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: actorId, sid: randomUUID(), email, email_verified: true, role: 'USER', token_use: 'access', iss: 'workspace-hub', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
}
function json(res, data, status = 200) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); }
async function body(req) { const chunks = []; for await (const part of req) chunks.push(part); return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
const sse = (text, finish = null) => 'data: ' + JSON.stringify({ id: 'runtime-completion', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: finish }] }) + '\n\n';

async function main() {
  await mkdir(out, { recursive: true });
  const apiPort = await port(), webPort = await port(), bridgePort = await port(), pgPort = await port(), redisPort = await port();
  const apiUrl = `http://127.0.0.1:${apiPort}`, webUrl = `http://127.0.0.1:${webPort}`, bridgeUrl = `http://127.0.0.1:${bridgePort}`;
  const token = jwt(), key = randomBytes(32).toString('hex'), password = randomBytes(24).toString('hex');
  if (process.argv.includes('--live-model')) {
    const { parse } = ai('dotenv');
    providerEnv = parse(await readFile(resolve(root, 'backend/ai-service/.env'), 'utf8'));
    assert.ok(providerEnv.LLM_BASE_URL && providerEnv.LLM_API_KEY && providerEnv.LLM_MODEL, 'Configured live provider required');
  }
  stage('isolated-infrastructure');
  for (const [service, mappedPort, extra] of [['postgres', pgPort, ['-e', 'POSTGRES_PASSWORD=' + password]], ['redis', redisPort, []]]) {
    const image = await command('docker', ['inspect', '--format', '{{.Image}}', 'wh_' + service]);
    const name = runId + '-' + service; containers.push(name);
    await command('docker', ['run', '-d', '--pull=never', '--name', name, '--label', 'workspacehub.work-runtime=' + runId,
      '-p', `127.0.0.1:${mappedPort}:${service === 'postgres' ? 5432 : 6379}`, ...extra, image]);
  }
  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${pgPort}/postgres`;
  await until(async () => {
    const probe = new (ai('pg').Client)({ connectionString: databaseUrl, connectionTimeoutMillis: 1000 });
    try { await probe.connect(); return true; } finally { await probe.end().catch(() => {}); }
  }, 'isolated PostgreSQL');
  db = new (ai('pg').Client)({ connectionString: databaseUrl }); await db.connect();
  for (const file of ['001_notebooks.sql', '002_meeting_summaries.sql', '003_work_assistant.sql', '004_work_assistant_conversations.sql', '005_ai_performance.sql', '006_voice_transcripts.sql', '007_shared_voice_transcripts.sql'])
    await db.query(await readFile(resolve(root, 'backend/ai-service/api/migrations', file), 'utf8'));
  await db.query('INSERT INTO notebook_ai.work_assistant_sessions(id,owner_id,scope_key) VALUES($1,$2,$3)', [sessionId, actorId, sessionId]);
  for (let i = 0; i < 10; i++) {
    const id = randomUUID();
    await db.query("INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id,status,created_at) VALUES($1,$2,$3,'COMPLETED',now()-interval '1 hour')", [id, sessionId, actorId]);
    for (const [offset, role] of [[0, 'user'], [1, 'assistant']]) await db.query(
      'INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,created_at) VALUES($1,$2,$3,$4,$5,now()-make_interval(secs=>$6))',
      [randomUUID(), sessionId, id, role, `Earlier ${role} turn ${i + 1}. ` + 'Synthetic history detail. '.repeat(50), 3600 - i * 2 - offset]);
  }
  server = createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', webUrl); res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-headers', 'authorization,content-type'); res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const path = new URL(req.url, bridgeUrl).pathname;
    try {
      if (path === '/v1/chat/completions') {
        const data = await body(req); modelInputs.push(data);
        if (mode === 'live') {
          assert.equal(++liveCalls, 1, 'Live model is called once only');
          const abort = new AbortController(); res.on('close', () => abort.abort());
          const response = await fetch(providerEnv.LLM_BASE_URL.replace(/\/$/, '') + '/chat/completions', { method: 'POST', redirect: 'error',
            headers: { 'content-type': 'application/json', authorization: 'Bearer ' + providerEnv.LLM_API_KEY },
            body: JSON.stringify({ ...data, model: providerEnv.CONVERSATION_AI_MODEL || providerEnv.LLM_MODEL }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90000)]) });
          res.writeHead(response.status, { 'content-type': 'text/event-stream' });
          if (response.body) Readable.fromWeb(response.body).on('error', () => res.destroy()).pipe(res); else res.end();
          return;
        }
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write(sse(mode === 'broken' ? 'Unfinished fixture output' : 'Start with '));
        const selected = mode;
        const timer = setTimeout(() => {
          if (selected !== 'broken') { res.write(sse('Runtime smoke task today.')); res.write(sse('', 'stop')); }
          res.end();
        }, selected === 'slow' ? 15000 : 2500);
        res.on('close', () => clearTimeout(timer)); return;
      }
      if (path === '/api/users/internal/sessions/authorize') return json(res, { active: true });
      if (path === '/internal/work-assistant/authorize') { const data = await body(req); return json(res, { data: { projectIds: data.projectIds.filter(id => id === projectId) } }); }
      if (path === '/internal/work-assistant/context') {
        const data = await body(req);
        return json(res, { data: 'windowStart' in data ? { available: true, timeZone: 'Asia/Ho_Chi_Minh', partial: false, busyPartial: false, busy: [], tasks: [], metrics: { ...metrics, open: 0, dueToday: 0 }, focus: { seconds: 0, sessions: 0, perTask: [] } }
          : { available: true, projectIds: [projectId], partial: false, tasks: [task], metrics } });
      }
      if (path.startsWith('/api/ai/work-assistant')) {
        const abort = new AbortController(); res.on('close', () => abort.abort());
        const response = await fetch(apiUrl + req.url, { method: req.method, headers: { authorization: 'Bearer ' + token, 'x-workspace-gateway-key': key,
          'x-user-id': actorId, 'x-user-email': email, 'x-user-role': 'USER', 'content-type': 'application/json' },
          ...(req.method === 'POST' ? { body: JSON.stringify(await body(req)) } : {}), signal: abort.signal });
        res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/json' });
        if (response.body) Readable.fromWeb(response.body).on('error', () => res.destroy()).pipe(res); else res.end(); return;
      }
      return json(res, { data: {} });
    } catch { if (!res.headersSent) json(res, { message: 'Runtime fixture request failed' }, 503); else res.end(); }
  });
  await new Promise(resolve => server.listen(bridgePort, '127.0.0.1', resolve));
  stage('compiled-api');
  const apiProcess = start(['dist/main.js'], resolve(root, 'backend/ai-service/api'), {
    AI_ENABLED: 'true', WORK_ASSISTANT_ENABLED: 'true', CONVERSATION_AI_ENABLED: 'false', MEETING_SUMMARY_ENABLED: 'false', VOICE_TRANSCRIPTION_ENABLED: 'false', VISUAL_ENABLED: 'false',
    DATABASE_URL: databaseUrl, REDIS_URL: `redis://127.0.0.1:${redisPort}/0`, PORT: String(apiPort), BIND_HOST: '127.0.0.1',
    AI_GATEWAY_KEY: key, AI_DOCUMENT_SERVICE_KEY: key, RAG_SERVICE_KEY: key, AI_TO_USER_KEY: key, AI_TO_PROJECT_KEY: key, AI_TO_CALENDAR_KEY: key,
    DOCUMENT_SERVICE_URL: bridgeUrl, RAG_WORKER_URL: bridgeUrl, USER_SERVICE_URL: bridgeUrl,
    WORK_ASSISTANT_PROJECT_URL: bridgeUrl, WORK_ASSISTANT_CALENDAR_URL: bridgeUrl, FRONTEND_URL: webUrl,
    JWT_SECRET_KEY: secret, JWT_ISSUER: 'workspace-hub', LLM_BASE_URL: bridgeUrl + '/v1', LLM_API_KEY: 'fixture-only', LLM_MODEL: 'runtime-fixture',
    LLM_REQUESTS_PER_MINUTE: '100', LLM_TOKENS_PER_MINUTE: '200000', LLM_REQUESTS_PER_DAY: '1000',
  });
  await until(async () => { if (apiProcess.exitCode !== null) throw new Error('API exited'); return (await fetch(apiUrl + '/health')).ok; }, 'compiled API');
  stage('cross-session-isolation');
  const foreignSession = randomUUID();
  await db.query('INSERT INTO notebook_ai.work_assistant_sessions(id,owner_id,scope_key) VALUES($1,$2,$3)', [foreignSession, randomUUID(), foreignSession]);
  const foreignRequest = randomUUID();
  await db.query("INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id,status) SELECT $1,id,owner_id,'COMPLETED' FROM notebook_ai.work_assistant_sessions WHERE id=$2", [foreignRequest, foreignSession]);
  await db.query("INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content) VALUES($1,$2,$3,'assistant','FOREIGN_HISTORY_SHOULD_NEVER_APPEAR')", [randomUUID(), foreignSession, foreignRequest]);
  for (const [path, method, payload] of [
    [`/api/ai/work-assistant/session?sessionId=${foreignSession}`, 'GET'],
    [`/api/ai/work-assistant/sessions/${foreignSession}/messages`, 'POST', { question: 'Plan today', requestId: randomUUID(), audience: 'mine' }],
  ]) {
    const denied = await fetch(bridgeUrl + path, { method, ...(payload ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) } : {}) });
    assert.equal(denied.status, 404); assert.equal((await denied.text()).includes('FOREIGN_HISTORY_SHOULD_NEVER_APPEAR'), false);
  }
  assert.equal(modelInputs.length, 0, 'A foreign session cannot invoke the model');
  stage('frontend');
  start(['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(webPort)], resolve(root, 'frontend/web'), {
    NEXT_PUBLIC_API_URL: bridgeUrl, NEXT_TELEMETRY_DISABLED: '1',
  });
  await until(async () => (await fetch(webUrl + '/login')).status < 500, 'frontend', 120000);
  stage('browser-streaming');
  browser = await web('playwright').chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.name));
  await context.routeWebSocket(/\/(communication|notification|project|socket)\.io\//, socket => socket.close());
  await context.route('https://accounts.google.com/**', route => route.fulfill({ status: 200, body: '' }));
  await context.route('**/health/**', route => route.fulfill({ json: { success: true, data: { status: 'ok' } } }));
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/ai/work-assistant')) return route.continue();
    let data = [];
    if (path === '/api/auth/refresh') data = { accessToken: token, userId: actorId, email, fullName: 'Runtime Fixture', role: 'USER' };
    else if (path === '/api/users/me/settings') data = { timezone: 'Asia/Ho_Chi_Minh', muteNotification: true, theme: 'LIGHT', language: 'EN', allowNewDirectMessages: true };
    else if (path.includes('/users/me')) data = { id: actorId, fullName: 'Runtime Fixture', email };
    else if (path === '/api/projects') data = [{ id: projectId, name: 'Runtime fixture', ownerId: actorId, status: 'ACTIVE', archived: false }];
    else if (path.includes('/notifications/unread-count')) data = { unreadCount: 0 };
    else if (path.includes('/pomodoro/state')) data = null;
    else if (path.includes('/pomodoro/config')) data = { focusDuration: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4, dailyGoalPomodoros: 8 };
    else if (path.includes('/meetings/upcoming')) data = { items: [], total: 0, hasNext: false };
    await route.fulfill({ json: { success: true, data, meta: { page: 1, limit: 100, total: 0, totalPages: 1 }, pagination: { totalItems: 0, totalPages: 1 } } });
  });
  await page.goto(webUrl + '/dashboard');
  await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
  const panel = page.locator('#work-assistant-panel');
  await panel.getByText('Earlier user turn 1.', { exact: false }).first().waitFor();
  const input = panel.getByRole('textbox', { name: 'Question for AI Assistant' });
  await input.fill('What should I work on first today?');
  const began = performance.now();
  await panel.getByRole('button', { name: 'Send question', exact: true }).click();
  await panel.getByText('Writing response…', { exact: true }).waitFor();
  await until(() => panel.getByText('Writing response…', { exact: true }).evaluate(element => {
    const label = element.getBoundingClientRect();
    const input = document.getElementById('work-question').getBoundingClientRect();
    return label.top > 0 && label.bottom < input.top;
  }), 'streamed text scrolled into view', 10000);
  const firstVisibleMs = Math.round(performance.now() - began);
  assert.equal((await db.query("SELECT count(*)::int n FROM notebook_ai.work_assistant_messages WHERE content='Start with Runtime smoke task today.'")).rows[0].n, 0);
  await page.screenshot({ path: resolve(out, 'desktop-streaming.png'), fullPage: true });
  await panel.getByRole('button', { name: 'Send question', exact: true }).waitFor();
  await until(async () => (await db.query("SELECT count(*)::int n FROM notebook_ai.work_assistant_messages WHERE content='Start with Runtime smoke task today.'")).rows[0].n === 1, 'saved answer');
  const history = modelInputs[0].messages.filter(message => typeof message.content === 'string' && message.content.startsWith('Earlier '));
  assert.equal(history.length, 20); assert.ok(Buffer.byteLength(JSON.stringify(history)) <= 12000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(out, 'mobile-completed.png'), fullPage: true });
  const box = await panel.boundingBox(); assert.ok(box && box.width <= 390 && box.x >= 0);
  stage('browser-cancellation'); mode = 'slow';
  await input.fill('What should I do today?'); await panel.getByRole('button', { name: 'Send question', exact: true }).click();
  await panel.getByText('Writing response…', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Stop response', exact: true }).click();
  await panel.getByText('Response stopped.', { exact: true }).waitFor();
  await until(async () => (await db.query("SELECT count(*)::int n FROM notebook_ai.work_assistant_requests WHERE status='CANCELED'")).rows[0].n === 1, 'canceled request');
  stage('browser-interrupted-provider'); mode = 'broken';
  await input.fill('What should I work on today?'); await panel.getByRole('button', { name: 'Send question', exact: true }).click();
  await panel.getByText('Writing response…', { exact: true }).waitFor();
  await until(async () => (await db.query("SELECT count(*)::int n FROM notebook_ai.work_assistant_requests WHERE status='FAILED'")).rows[0].n === 1, 'failed request');
  await panel.getByRole('alert').waitFor();
  assert.equal(await panel.getByText('Unfinished fixture output', { exact: true }).count(), 0);
  assert.equal((await db.query("SELECT count(*)::int n FROM notebook_ai.work_assistant_messages WHERE role='assistant' AND session_id=$1", [sessionId])).rows[0].n, 11);
  stage('new-conversation-isolation'); mode = 'normal';
  await panel.getByRole('button', { name: 'New conversation', exact: true }).click();
  await panel.getByText('What would you like to work on?', { exact: true }).waitFor();
  assert.equal(await panel.getByText('Earlier user turn 1.', { exact: false }).count(), 0);
  await input.fill('What should I work on today in this new conversation?');
  await panel.getByRole('button', { name: 'Send question', exact: true }).click();
  await panel.getByText('Writing response…', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Send question', exact: true }).waitFor();
  assert.equal(modelInputs.at(-1).messages.some(message => typeof message.content === 'string' && message.content.startsWith('Earlier ')), false);
  let live = { requested: false };
  if (providerEnv) {
    stage('live-provider-synthetic-context'); mode = 'live';
    const started = performance.now();
    const response = await fetch(bridgeUrl + `/api/ai/work-assistant/sessions/${sessionId}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'What should I work on first today? Reply in one short English sentence.', requestId: randomUUID(), audience: 'mine', timeZone: 'Asia/Ho_Chi_Minh' }) });
    let firstDeltaMs, complete = false, text = '';
    const reader = response.body.getReader();
    while (true) { const part = await reader.read(); if (part.done) break; text += new TextDecoder().decode(part.value);
      if (firstDeltaMs === undefined && text.includes('event: delta')) firstDeltaMs = Math.round(performance.now() - started);
      if (text.includes('event: done')) complete = true;
    }
    live = { requested: true, calls: liveCalls, status: response.status, completed: complete, firstDeltaMs, totalMs: Math.round(performance.now() - started) };
    assert.equal(liveCalls, 1); assert.equal(complete, true, 'Live provider must complete the fixture request');
  }
  assert.deepEqual(errors, [], 'No browser page errors');
  const result = { passed: true, checks: ['compiled API', 'real isolated PostgreSQL/Redis', '20-message budget', 'progressive desktop rendering', 'completed-only persistence', 'mobile layout', 'cancellation', 'interrupted provider', 'foreign session access denied without model calls', 'new conversation excludes old history'],
    firstVisibleMs, live, metrics: reports, pageErrorTypes: errors, screenshots: out };
  await writeFile(resolve(out, 'result.json'), JSON.stringify(result, null, 2));
  await writeFile(resolve(out, providerEnv ? 'result-live.json' : 'result-fixture.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

try { await main(); }
catch (error) { console.error(JSON.stringify({ passed: false, phase, errorType: error.constructor.name, reason: error instanceof assert.AssertionError || error.name === 'TimeoutError' ? error.message.split('\n')[0].slice(0, 250) : undefined })); process.exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  for (const child of children.reverse()) if (child.exitCode === null) {
    if (process.platform === 'win32') await command('taskkill', ['/PID', String(child.pid), '/T', '/F']).catch(() => {});
    else child.kill('SIGTERM');
  }
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (db) await db.end().catch(() => {});
  for (const name of containers.reverse()) {
    try {
      const label = await command('docker', ['inspect', '--format', '{{index .Config.Labels "workspacehub.work-runtime"}}', name]);
      assert.equal(label, runId); await command('docker', ['rm', '-fv', name]);
    } catch { console.error(JSON.stringify({ cleanupFailed: name })); }
  }
}
