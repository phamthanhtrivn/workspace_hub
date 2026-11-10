import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';

const label = () => randomBytes(6).toString('hex').toUpperCase();
const names = ['dashboard', 'projects', 'calendar', 'project_a', 'project_b'];
const percentile = (values, fraction) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1] : null;

export function liveContextFixture(name, workload) {
  const facts = Object.fromEntries(['secret', 'early', 'middle', 'recent', 'corrected', 'tail', 'outside'].map(key => [key, label()]));
  const filler = workload === 'short' ? 'Routine planning discussion.' : workload === 'long_ascii'
    ? 'Discuss estimates, routine planning and small next steps. '.repeat(45)
    : 'Trao đổi kế hoạch công việc, ghi chú và kiểm tra tiến độ tiếng Việt 🙂. '.repeat(55);
  const messages = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: filler }));
  messages[0].content = `secret=${facts.secret}; context=${name}. ` + filler;
  const prefix = workload === 'short' ? '' : 'Ordinary detail preceding the decision. '.repeat(8);
  messages[2].content = prefix + `early=${facts.early}. ` + filler;
  messages[3].content = 'Previously there were 99 open tasks. ' + filler;
  messages[4].content = `corrected=OLD-${label()}. ` + filler;
  messages[6].content = filler.repeat(8) + ` tail=${facts.tail}.`;
  messages[8].content = `middle=${facts.middle}. ` + filler;
  messages[16].content = `recent=${facts.recent}. ` + filler;
  messages[18].content = `Correction: the current preference is corrected=${facts.corrected}. ` + filler;
  return { name, workload, facts, messages: [
    { role: 'user', content: `outside=${facts.outside}.` }, { role: 'assistant', content: 'Older than the history window.' }, ...messages,
  ] };
}

function parseAnswer(text) {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1'));
}

async function readAnswer(response, started) {
  let pending = '', answer, firstTextMs, failure;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      pending += decoder.decode(part.value, { stream: !part.done }).replace(/\r\n/g, '\n');
      let split;
      while ((split = pending.indexOf('\n\n')) >= 0) {
        const block = pending.slice(0, split); pending = pending.slice(split + 2);
        const event = block.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim();
        const raw = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
        if (!event || !raw) continue;
        const data = JSON.parse(raw);
        if (event === 'delta' && data.text) firstTextMs ??= Math.round(performance.now() - started);
        if (event === 'done') answer = data.message.content;
        if (event === 'error') failure = { status: data.status, message: data.message };
      }
      if (part.done) break;
    }
  } finally { reader.releaseLock(); }
  return { rawAnswer: answer, firstTextMs, failure, completionMs: Math.round(performance.now() - started) };
}

// Uses the actual compiled HTTP API, store, history truncation and model pipeline.
// Only generated fixture contents cross the live provider boundary. No retries.
export async function verifyLiveContext({ db, bridgeUrl, actorId, projectId, secondProjectId, modelInputs, configuredModel }) {
  const fixtures = names.map((name, index) => liveContextFixture(name, index === 1 ? 'long_ascii' : index === 2 ? 'long_unicode' : 'short'));
  const contexts = [{ contextType: 'dashboard' }, { contextType: 'projects' }, { contextType: 'calendar' },
    { contextType: 'project_detail', projectId }, { contextType: 'project_detail', projectId: secondProjectId }];
  const base = bridgeUrl + '/api/ai/work-assistant';
  const results = []; let previousStart;
  async function create(context) {
    const response = await fetch(base + '/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(context) });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  }
  const sessions = [];
  for (const [index, fixture] of fixtures.entries()) {
    const session = await create(contexts[index]); sessions.push(session);
    for (let pair = 0; pair < 11; pair++) {
      const requestId = randomUUID();
      await db.query("INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id,status,created_at) VALUES($1,$2,$3,'COMPLETED',now()-interval '1 hour')", [requestId, session.id, actorId]);
      for (const offset of [0, 1]) {
        const position = pair * 2 + offset, message = fixture.messages[position];
        await db.query('INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,created_at) VALUES($1,$2,$3,$4,$5,now()-make_interval(secs=>$6))',
          [randomUUID(), session.id, requestId, message.role, message.content, 3600 - position]);
      }
    }
    const restored = await (await fetch(base + '/session?' + new URLSearchParams(contexts[index]))).json();
    assert.equal(restored.data.id, session.id); assert.equal(restored.data.messages.length, 22);
  }
  for (let index = 0; index < 6; index++) {
    const blank = index === 5, fixture = fixtures[blank ? 4 : index], context = contexts[blank ? 4 : index];
    const session = blank ? await create(context) : sessions[index];
    // One request per rolling minute avoids synthetic quota delays inside the API.
    // Each request still passes the API's real configured token admission limit.
    if (previousStart) {
      const waitMs = Math.max(0, 61500 - (performance.now() - previousStart));
      if (waitMs) { console.log(JSON.stringify({ phase: 'live-context-quota-spacing', scenario: blank ? 'new_conversation' : fixture.name, waitMs: Math.round(waitMs) })); await pause(waitMs); }
    }
    const question = 'Today, check our earlier planning notes. Return ONLY a JSON object with keys secret, early, middle, recent, corrected, tail, outside, other_contexts, open_tasks, project_id. '
      + 'For each label copy the exact recorded value, or null when it is not available in this conversation. corrected means the latest corrected preference. Do not guess or reconstruct missing values. '
      + 'other_contexts must be an object with dashboard, projects, calendar, project_a, project_b; each value is the secret explicitly recorded for that context, or null if unavailable. '
      + 'open_tasks must be the sum of current project and personal open metrics from fresh work data, treating absent sources as zero; never use an old number in the notes. '
      + 'project_id must be the current fresh work scope projectId or null. No explanation or markdown.';
    const inputBefore = modelInputs.length, started = performance.now(); previousStart = started;
    const response = await fetch(base + `/sessions/${session.id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...context, question, requestId: randomUUID(), audience: context.contextType === 'projects' || context.contextType === 'calendar' ? context.contextType : 'mine', timeZone: 'Asia/Ho_Chi_Minh' }),
      signal: AbortSignal.timeout(115000) });
    const result = response.ok ? await readAnswer(response, started) : { failure: { status: response.status }, completionMs: Math.round(performance.now() - started) };
    const inputs = modelInputs.slice(inputBefore);
    const messages = inputs[0]?.messages ?? [], questionIndex = messages.findIndex(m => m.role === 'user' && m.content === question);
    const visible = questionIndex >= 0 ? messages.slice(1, questionIndex).filter(m => m.content && (m.role === 'user' || m.role === 'assistant')) : [];
    const text = visible.map(m => m.content).join('\n');
    const expected = Object.fromEntries(Object.entries(fixture.facts).map(([key, value]) => [key, text.includes(value) ? value : null]));
    expected.other_contexts = Object.fromEntries(names.map(name => [name, !blank && name === fixture.name && text.includes(fixture.facts.secret) ? fixture.facts.secret : null]));
    expected.open_tasks = context.contextType === 'calendar' ? 0 : 1;
    expected.project_id = context.projectId ?? null;
    let answer;
    try { if (result.rawAnswer) answer = parseAnswer(result.rawAnswer); } catch { result.parseFailure = true; }
    const labelChecks = Object.fromEntries(Object.entries(expected).filter(([key]) => key !== 'other_contexts').map(([key, value]) => [key, !!answer && answer[key] === value]));
    const otherChecks = Object.fromEntries(names.map(name => [name, !!answer && Object.hasOwn(answer.other_contexts ?? {}, name) && answer.other_contexts[name] === expected.other_contexts[name]]));
    const foreignFixtures = blank ? fixtures : fixtures.filter(f => f !== fixture);
    const foreignValues = foreignFixtures.flatMap(f => Object.values(f.facts));
    const inputIsolated = inputs.length === 1 && !foreignValues.some(value => JSON.stringify(inputs).includes(value));
    const leakedValues = foreignValues.filter(value => (result.rawAnswer ?? '').includes(value));
    const historyCorrect = visible.length === (blank ? 0 : 20) && Buffer.byteLength(JSON.stringify(visible)) <= 12000;
    const retained = Object.entries(fixture.facts).filter(([, value]) => text.includes(value));
    const row = { scenario: blank ? 'new_conversation' : fixture.name, workload: blank ? 'empty' : fixture.workload,
      context, sessionId: session.id, httpStatus: response.status, ...result, historyMessages: visible.length, historyBytes: Buffer.byteLength(JSON.stringify(visible)),
      transmittedFacts: Object.fromEntries(Object.entries(fixture.facts).map(([key, value]) => [key, text.includes(value)])),
      expected, answer, labelChecks, otherChecks, inputIsolated, historyCorrect, leakedValues,
      retainedRecall: { correct: retained.filter(([key, value]) => answer?.[key] === value).length, total: retained.length },
      absentFalseClaims: Object.entries(expected).filter(([key, value]) => value === null && answer?.[key] != null).map(([key]) => key),
      passed: !result.failure && !result.parseFailure && historyCorrect && inputIsolated && !leakedValues.length && Object.values(labelChecks).every(Boolean) && Object.values(otherChecks).every(Boolean) };
    results.push(row);
    console.log(JSON.stringify({ phase: 'live-context-result', scenario: row.scenario, passed: row.passed, historyMessages: row.historyMessages,
      historyBytes: row.historyBytes, firstTextMs: row.firstTextMs, completionMs: row.completionMs, retainedRecall: row.retainedRecall,
      absentFalseClaims: row.absentFalseClaims, inputIsolated, leakedValueCount: leakedValues.length, failure: row.failure, parseFailure: row.parseFailure }));
    if (inputs.length !== 1 || result.failure) break;
  }
  const summary = { scenarios: results.length, scenariosPassed: results.filter(r => r.passed).length,
    retainedFacts: results.reduce((n, r) => n + r.retainedRecall.total, 0), recalledFacts: results.reduce((n, r) => n + r.retainedRecall.correct, 0),
    isolatedInputs: results.filter(r => r.inputIsolated).length, leakedValueCount: results.reduce((n, r) => n + r.leakedValues.length, 0),
    absentFalseClaims: results.reduce((n, r) => n + r.absentFalseClaims.length, 0),
    medianFirstTextMs: percentile(results.filter(r => r.firstTextMs != null).map(r => r.firstTextMs), .5),
    medianCompletionMs: percentile(results.map(r => r.completionMs), .5) };
  return { passed: results.length === 6 && results.every(r => r.passed), configuredModel, providerRequests: modelInputs.length,
    measuredAt: new Date().toISOString(), scope: 'Real compiled API and PostgreSQL; fixture work-data/auth services; configured live model; six synthetic cases; no retries.',
    quotaSpacingExcluded: true, summary, results };
}
