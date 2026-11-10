import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Invoked by work-assistant-runtime.mjs against its real API and isolated database.
export async function verifyContextApi({ db, bridgeUrl, actorId, projectId, secondProjectId, sessionId, modelInputs, allowedProjects }) {
  const base = '/api/ai/work-assistant';
  const contexts = [
    { contextType: 'dashboard' }, { contextType: 'projects' }, { contextType: 'calendar' },
    { contextType: 'project_detail', projectId }, { contextType: 'project_detail', projectId: secondProjectId },
  ];
  async function request(path, context, expected = 200, method = 'GET') {
    const response = await fetch(bridgeUrl + base + path + (method === 'GET' ? '?' + new URLSearchParams(context) : ''), {
      method, ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(context) } : {}),
    });
    assert.equal(response.status, expected, `${method} ${path} ${JSON.stringify(context)}`);
    return response;
  }
  async function get(path, context) { return (await (await request(path, context)).json()).data; }
  const sessions = [], markers = [];
  for (const [index, context] of contexts.entries()) {
    // Concurrent initial loads (multiple tabs or Strict Mode) create exactly one.
    const results = await Promise.all(Array.from({ length: 8 }, () => get('/session', context)));
    assert.equal(new Set(results.map(s => s.id)).size, 1);
    const current = results[0]; sessions.push(current);
    assert.equal(current.contextType, context.contextType); assert.equal(current.projectId, context.projectId ?? null);
    assert.equal((await get('/sessions', context)).sessions.length, 1);
    if (index === 0) { assert.equal(current.id, sessionId); continue; }
    assert.equal(current.messages.length, 0, 'new page starts without another page history');
    const marker = 'CONTEXT_ONLY_' + index, requestId = randomUUID(), messageId = randomUUID();
    markers.push({ index, marker, messageId });
    await db.query("INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id,status,created_at) VALUES($1,$2,$3,'COMPLETED',now()-interval '1 hour')", [requestId, current.id, actorId]);
    await db.query("INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content) VALUES($1,$2,$3,'user',$4)", [messageId, current.id, requestId, marker]);
    assert.equal((await get('/session', context)).messages[0].content, marker);
  }
  assert.equal(new Set(sessions.map(s => s.id)).size, 5);
  const created = (await (await request('/sessions', contexts[1], 201, 'POST')).json()).data;
  assert.notEqual(created.id, sessions[1].id); assert.deepEqual(created.messages, []);
  assert.equal((await get('/session', contexts[1])).id, created.id, 'empty new conversation is restored');
  assert.equal((await get('/session', { ...contexts[1], sessionId: sessions[1].id })).messages[0].content, markers[0].marker);
  // Simulate an older conversation receiving a new answer: ordering must use updated_at.
  await db.query('UPDATE notebook_ai.work_assistant_sessions SET updated_at=clock_timestamp() WHERE id=$1', [sessions[1].id]);
  assert.equal((await get('/session', contexts[1])).id, sessions[1].id);
  assert.equal((await get('/sessions', contexts[1])).sessions[0].id, sessions[1].id);

  const beforeModel = modelInputs.length;
  await request('/session', {}, 400);
  await request('/session', { contextType: 'project_detail' }, 400);
  await request('/sessions', { contextType: 'calendar', projectId }, 400);
  await request('/sessions', { contextType: 'project_detail', projectId: randomUUID() }, 403, 'POST');
  await request('/session', { ...contexts[2], sessionId }, 404);
  await request('/session', { ...contexts[4], sessionId: sessions[3].id }, 404);
  await request('/session', { ...contexts[2], before: markers[0].messageId }, 404);
  await request(`/sessions/${sessionId}/messages`, { ...contexts[2], question: 'today', requestId: randomUUID(), audience: 'calendar' }, 404, 'POST');
  await request(`/sessions/${sessions[2].id}/messages`, { ...contexts[2], question: 'today', requestId: randomUUID(), audience: 'projects' }, 400, 'POST');
  const foreign = (await db.query('SELECT id FROM notebook_ai.work_assistant_sessions WHERE owner_id<>$1 LIMIT 1', [actorId])).rows[0].id;
  const foreignRequest = (await db.query('SELECT id FROM notebook_ai.work_assistant_requests WHERE session_id=$1', [foreign])).rows[0].id;
  await request('/sessions', { ...contexts[0], before: foreign }, 404);
  await request(`/requests/${foreignRequest}/cancel`, {}, 404, 'POST');
  allowedProjects.delete(projectId);
  await request('/session', contexts[3], 403);
  await request('/sessions', contexts[3], 403);
  await request(`/sessions/${sessions[3].id}/messages`, { ...contexts[3], question: 'today', requestId: randomUUID(), audience: 'mine' }, 403, 'POST');
  allowedProjects.add(projectId);
  assert.equal(modelInputs.length, beforeModel, 'denied context and authorization requests never reach the model');

  for (const index of [2, 3, 4]) {
    const context = contexts[index], marker = markers.find(m => m.index === index).marker;
    const audience = context.contextType === 'calendar' ? 'calendar' : 'mine';
    const response = await request(`/sessions/${sessions[index].id}/messages`, { ...context, question: 'What should I do today?', requestId: randomUUID(), audience, timeZone: 'Asia/Ho_Chi_Minh' }, 200, 'POST');
    const text = await response.text(); assert.ok(text.includes('event: done'), text);
    const messages = modelInputs.at(-1).messages;
    assert.ok(messages.some(m => m.content === marker));
    for (const other of markers.filter(m => m.index !== index)) assert.equal(messages.some(m => m.content === other.marker), false);
    assert.equal(messages.some(m => String(m.content).startsWith('Earlier ')), false);
    const tool = messages.find(m => m.role === 'tool'); assert.ok(tool, 'actual SDK receives authorized context');
    const data = JSON.parse(tool.content);
    assert.deepEqual(data.scope, { ...(context.projectId ? { projectId: context.projectId } : {}), audience });
    if (index === 2) assert.deepEqual(data.tasks, []);
    else assert.ok(data.tasks.every(t => t.projectId === context.projectId));
    const saved = await get('/session', context);
    assert.deepEqual(saved.messages.at(-1).context.scope, data.scope);
  }
  // Stable cursor pagination must remain within its context and break timestamp ties by UUID.
  const tie = '2026-01-01T00:00:00.123456Z';
  for (let i = 0; i < 32; i++) {
    const id = randomUUID();
    await db.query("INSERT INTO notebook_ai.work_assistant_sessions(id,owner_id,scope_key,context_type,updated_at) VALUES($1,$2,$3,'projects',$4)", [id, actorId, id, tie]);
  }
  const first = await get('/sessions', contexts[1]); assert.equal(first.sessions.length, 30); assert.ok(first.nextCursor);
  const second = await get('/sessions', { ...contexts[1], before: first.nextCursor });
  assert.equal(second.sessions.length, 4); assert.equal(new Set([...first.sessions, ...second.sessions].map(s => s.id)).size, 34);
  assert.ok([...first.sessions, ...second.sessions].every(s => s.contextType === 'projects' && s.projectId === null));
  await request('/sessions', { ...contexts[2], before: first.nextCursor }, 404);
  // Cancellation atomically frees the per-user slot, and completed status is never rewritten.
  const cancelId = randomUUID();
  await db.query('INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id) VALUES($1,$2,$3)', [cancelId, sessionId, actorId]);
  await request(`/requests/${cancelId}/cancel`, {}, 201, 'POST');
  const canceled = (await db.query('SELECT status,cancel_requested FROM notebook_ai.work_assistant_requests WHERE id=$1', [cancelId])).rows[0];
  assert.deepEqual(canceled, { status: 'CANCELED', cancel_requested: true });
  await db.query("UPDATE notebook_ai.work_assistant_requests SET created_at=now()-interval '1 hour' WHERE owner_id=$1", [actorId]);
  return ['migration rerun and legacy history preserved', '40 concurrent restores create five contexts', 'empty New Conversation restored', 'updated_at restoration and ordering', 'cross-context cursors and sessions denied', 'project membership and ownership enforced', 'real SDK history and data scope isolated', 'stable context pagination', 'cancellation frees active slot'];
}

export async function verifyContextBrowser({ page, webUrl, db, actorId, projectId, secondProjectId, until, setMode }) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const panel = page.locator('#work-assistant-panel');
  const count = async () => (await db.query('SELECT count(*)::int n FROM notebook_ai.work_assistant_sessions WHERE owner_id=$1', [actorId])).rows[0].n;
  const initialCount = await count();
  async function navigate(path, marker) {
    await page.locator(`a[href="${path}"]`).first().click();
    await page.waitForURL(webUrl + path);
    await panel.getByText(marker, { exact: true }).waitFor();
    assert.equal(await panel.getByText('Earlier user turn 1.', { exact: false }).count(), 0);
  }
  await navigate('/projects', 'CONTEXT_ONLY_1');
  await navigate(`/projects/${projectId}`, 'CONTEXT_ONLY_3');
  assert.equal(await panel.getByText('CONTEXT_ONLY_1', { exact: true }).count(), 0);
  await navigate('/projects', 'CONTEXT_ONLY_1');
  await navigate(`/projects/${secondProjectId}`, 'CONTEXT_ONLY_4');
  assert.equal(await panel.getByText('CONTEXT_ONLY_3', { exact: true }).count(), 0);
  await navigate('/calendar', 'CONTEXT_ONLY_2');
  assert.equal(await count(), initialCount, 'client navigation restores existing conversations');
  // Refresh opens the same latest Calendar conversation and does not bootstrap another row.
  await page.reload();
  await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
  await panel.getByText('CONTEXT_ONLY_2', { exact: true }).waitFor();
  assert.equal(await count(), initialCount);
  await page.locator('a[href="/dashboard"]').first().click();
  await page.waitForURL(webUrl + '/dashboard');
  const dashboardQuestion = 'What should I work on today in this new conversation?';
  await panel.getByText(dashboardQuestion, { exact: true }).waitFor();
  setMode('slow');
  const question = 'Cancel this dashboard turn when navigating';
  await panel.getByRole('textbox', { name: 'Question for AI Assistant' }).fill(question);
  await panel.getByRole('button', { name: 'Send question', exact: true }).click();
  await panel.getByText('Writing response…', { exact: true }).waitFor();
  const active = (await db.query("SELECT id FROM notebook_ai.work_assistant_requests WHERE owner_id=$1 AND status='RUNNING'", [actorId])).rows[0].id;
  await navigate('/calendar', 'CONTEXT_ONLY_2');
  setMode('normal');
  await panel.getByRole('textbox', { name: 'Question for AI Assistant' }).fill('Calendar follow-up after navigation');
  await panel.getByRole('button', { name: 'Send question', exact: true }).click();
  await panel.getByText('Writing response…', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Send question', exact: true }).waitFor();
  await until(async () => (await db.query('SELECT status FROM notebook_ai.work_assistant_requests WHERE id=$1', [active])).rows[0].status === 'CANCELED', 'navigation cancels old request');
  assert.equal((await db.query('SELECT count(*)::int n FROM notebook_ai.work_assistant_messages WHERE request_id=$1', [active])).rows[0].n, 0);
  assert.equal(await panel.getByText(question, { exact: true }).count(), 0);
  assert.equal(await panel.getByText(dashboardQuestion, { exact: true }).count(), 0);
  assert.equal(await panel.getByRole('alert').count(), 0, 'new context can send immediately without active request conflict');
  return ['open panel follows sidebar and two project routes', 'browser refresh restores Calendar without duplication', 'navigation cancels stream without saving drafts', 'new context sends immediately after cancellation'];
}
