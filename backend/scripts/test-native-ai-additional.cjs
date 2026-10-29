const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const dir = path.resolve(root, '../.tmp/ai-native-stack');
const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json')));
const identities = JSON.parse(fs.readFileSync(path.join(dir, 'test-identities.json')));
const { owner, reader } = identities;
const { Pool } = createRequire(path.join(root, 'backend/ai-service/package.json'))('pg');
const communication = new Pool({ connectionString: `postgresql://qa:${state.keys.pg}@127.0.0.1:${state.ports.pg}/communication_db` });
const report = { runAt: new Date().toISOString(), cases: [], resources: {} };
const save = () => fs.writeFileSync(path.join(root, 'docs/testing/ai-comprehensive/native-additional.json'), JSON.stringify(report, null, 2) + '\n');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(method, url, body, user = owner, statuses = [200, 201]) {
  const response = await fetch(`http://127.0.0.1:${state.ports.kong}${url}`, { method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${user.accessToken}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(120000) });
  const text = await response.text();
  assert.ok(statuses.includes(response.status), `${method} ${url}: ${response.status} ${text.slice(0, 200)}`);
  return response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text).data : text;
}
async function run(id, fn) {
  const start = performance.now();
  try { await fn(); report.cases.push({ id, status: 'PASS', durationMs: Math.round(performance.now() - start) }); }
  catch (error) { report.cases.push({ id, status: 'FAIL', error: error.message.slice(0, 500) }); throw error; }
  finally { save(); console.log(JSON.stringify(report.cases.at(-1))); }
}
(async () => {
  await run('persisted-answer-masked-after-real-share-revocation', async () => {
    const share = await request('POST', `/api/documents/${identities.documentId}/sharing/shares`, { email: reader.email, permission: 'VIEWER' });
    const notebook = await request('POST', '/api/ai/notebooks', { title: 'Revocation saved history QA' }, reader);
    const [source] = await request('POST', `/api/ai/notebooks/${notebook.id}/sources`, { refs: [{ documentId: identities.documentId }] }, reader);
    let ready = false;
    for (let n = 0; n < 120; n++) {
      const snapshot = await request('GET', `/api/ai/notebooks/${notebook.id}`, undefined, reader);
      if (snapshot.sources[0].status === 'READY') { ready = true; break; }
      await pause(500);
    }
    assert.ok(ready);
    const answer = await request('POST', `/api/ai/notebooks/${notebook.id}/messages`, { requestId: randomUUID(), question: 'What is the approved budget?', sourceIds: [source.id] }, reader);
    assert.match(answer, /event: done/); assert.match(answer, /108/);
    const before = await request('GET', `/api/ai/notebooks/${notebook.id}`, undefined, reader);
    const saved = before.messages.find(item => item.role === 'ASSISTANT');
    assert.ok(saved?.content && saved.citations.length && !saved.hidden);
    await request('DELETE', `/api/documents/${identities.documentId}/sharing/shares/${share.id}`);
    const after = await request('GET', `/api/ai/notebooks/${notebook.id}`, undefined, reader);
    const masked = after.messages.find(item => item.id === saved.id);
    assert.equal(masked.hidden, true); assert.equal(masked.content, ''); assert.deepEqual(masked.citations, []);
    report.resources.revokedNotebookId = notebook.id;
  });
  await run('native-communication-ai-model-and-durable-outbox', async () => {
    const conversation = await request('POST', '/api/direct-conversations', { participantId: reader.userId });
    const context = await request('POST', `/api/direct-conversations/${conversation.id}/messages`, { content: 'Synthetic QA fact: the approved launch owner is Linh and the launch date is 2 November 2026.' });
    assert.ok(context.id);
    const trigger = await request('POST', `/api/direct-conversations/${conversation.id}/messages`, { content: '@ai Who is the approved launch owner? Read conversation history.' });
    let completed;
    for (let n = 0; n < 180; n++) {
      const { rows } = await communication.query('SELECT status FROM conversation_ai_requests WHERE id=$1', [trigger.id]);
      if (rows[0]?.status === 'COMPLETED') { completed = true; break; }
      if (['FAILED', 'CANCELLED'].includes(rows[0]?.status)) throw Error(`Conversation request ${rows[0].status}`);
      await pause(500);
    }
    assert.ok(completed, 'Conversation request did not complete in 90s');
    const { rows: replies } = await communication.query("SELECT content FROM direct_messages WHERE conversation_id=$1 AND type='AI'", [conversation.id]);
    assert.equal(replies.length, 1); assert.match(replies[0].content, /Linh/);
    for (let n = 0; n < 40; n++) {
      const { rows } = await communication.query('SELECT status FROM conversation_ai_outbox WHERE request_id=$1', [trigger.id]);
      if (rows[0]?.status === 'PUBLISHED') { report.resources.conversationId = conversation.id; return; }
      await pause(500);
    }
    throw Error('Saved reply outbox was not published in 20s');
  });
  await run('bounded-gateway-read-concurrency', async () => {
    const latencies = [];
    await Promise.all(Array.from({ length: 10 }, async () => {
      for (let n = 0; n < 10; n++) {
        const start = performance.now(); await request('GET', '/api/ai/notebooks'); latencies.push(performance.now() - start);
      }
    }));
    latencies.sort((a, b) => a - b);
    report.load = { requests: 100, concurrency: 10, failures: 0, p50Ms: Math.round(latencies[49]), p95Ms: Math.round(latencies[94]), scope: 'Local authenticated notebook reads; not an LLM throughput or production SLA benchmark' };
  });
  report.passed = true;
})().catch(error => { report.passed = false; console.error(error.message); process.exitCode = 1; })
  .finally(async () => { save(); await communication.end(); });
