// Run without arguments for deterministic retention/overhead checks; --live adds at most nine provider calls.
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ai = createRequire(resolve(root, 'backend/ai-service/api/package.json'));
const tooling = createRequire(resolve(root, 'backend/communication-service/package.json'));
tooling('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: {
  module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, experimentalDecorators: true,
} });
const historyModule = ai('./src/modules/work-assistant/work-history.ts');
const boundedHistory = historyModule.workHistory;
const { ChatOpenAI } = ai('@langchain/openai');
const live = process.argv.includes('--live');
const followup = process.argv.includes('--followup');
const out = resolve(root, '.tmp/work-assistant-deep-validation');
await mkdir(out, { recursive: true });
const variants = {
  four: history => history.slice(-4).filter(m => !m.hidden && m.content.trim()).map(m => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? 1000 : 1500) })),
  raw_twenty: history => history.slice(-20).filter(m => !m.hidden && m.content.trim()).map(m => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? 1000 : 1500) })),
  bounded_twenty: boundedHistory,
};

function record(role, content, extra = {}) { return { role, content, project_ids: [], ...extra }; }
function fixture(kind, round) {
  const nonce = randomBytes(3).toString('hex').toUpperCase();
  const facts = { early: 'EARLY-' + nonce, recent: 'RECENT-' + nonce, corrected: 'NEW-' + nonce,
    tail: 'TAIL-' + nonce, hidden: 'HIDDEN-' + nonce, outside: 'OUTSIDE-' + nonce };
  const filler = kind === 'short' ? 'Routine planning conversation.' : kind === 'long_ascii'
    ? 'Discuss routine checks, estimates and the next small step. '.repeat(35)
    : 'Trao đổi kế hoạch công việc, ghi chú và kiểm tra tiến độ tiếng Việt 🙂. '.repeat(45);
  const history = Array.from({ length: 20 }, (_, i) => record(i % 2 ? 'assistant' : 'user', filler));
  const prefix = kind === 'short' ? '' : 'Ordinary context preceding the decision. '.repeat(5);
  history[0].content = prefix + `The chosen early plan label is ${facts.early}. ` + filler;
  history[2].content = 'We previously said there were 99 open project tasks. ' + filler;
  history[4].content = 'The old preference label is OLD-' + nonce + '. ' + filler;
  history[6].content = 'A long note: ' + filler.repeat(10) + ` The tail-only label is ${facts.tail}.`;
  history[10] = record('user', `The hidden label is ${facts.hidden}.`, { hidden: true });
  history[16].content = `The recent plan label is ${facts.recent}. ` + filler;
  history[18].content = `Correction: replace the old preference with ${facts.corrected}. ` + filler;
  const all = [record('user', `The outside-window label is ${facts.outside}.`), record('assistant', 'Earlier conversation boundary.'), ...history];
  return { kind, round, facts, history: all };
}
function expectedFor(messages, facts) {
  const text = messages.map(m => m.content).join('\n');
  return Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, text.includes(value) ? value : null]));
}

const cases = ['short', 'long_ascii', 'long_unicode'].map((kind, round) => fixture(kind, round));
if (followup) {
  cases.splice(0, cases.length, fixture('long_ascii', 0), fixture('long_ascii', 1));
  for (const item of cases) for (const [field, old] of Object.entries(item.facts)) {
    const value = field.toUpperCase() + '-' + randomBytes(5).toString('hex').toUpperCase();
    for (const message of item.history) message.content = message.content.replaceAll(old, value);
    item.facts[field] = value;
  }
  cases[0].kind = 'long_ascii_missing_early';
  cases[1].kind = 'long_ascii_early_at_start';
  const first = cases[1].history[2];
  first.content = first.content.slice(first.content.indexOf('The chosen early plan label'));
}
const reportFile = followup ? 'context-followup.json' : 'context-benchmark.json';
const deterministic = [];
for (const item of cases) for (const [variant, transform] of Object.entries(variants)) {
  const messages = transform(item.history), expected = expectedFor(messages, item.facts);
  assert.equal(expected.hidden, null); assert.equal(expected.outside, null);
  assert.equal(expected.recent, item.facts.recent); assert.equal(expected.corrected, item.facts.corrected);
  if (variant === 'bounded_twenty') assert.ok(Buffer.byteLength(JSON.stringify(messages)) <= 12000);
  deterministic.push({ scenario: item.kind, variant, messages: messages.length, bytes: Buffer.byteLength(JSON.stringify(messages)),
    retainedFields: Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, value !== null])),
    earliestContentCharacters: messages[0]?.content.length ?? 0, latestContentCharacters: messages.at(-1)?.content.length ?? 0 });
}
// Exercise each position independently so a single surviving recent marker cannot mask missing older ones.
const positional = [];
for (const kind of ['short', 'long_ascii', 'long_unicode']) for (const placement of ['start', 'middle', 'tail']) {
  let retained = 0;
  const history = Array.from({ length: 20 }, (_, index) => {
    const marker = `POSITION_${String(index + 1).padStart(2, '0')}_END`;
    const filler = kind === 'short' ? 'Small detail. ' : kind === 'long_ascii' ? 'Ordinary planning detail. '.repeat(80) : 'Kế hoạch công việc tiếng Việt 🙂. '.repeat(80);
    const content = placement === 'start' ? marker + ' ' + filler : placement === 'middle' ? filler.slice(0, 250) + marker + filler : filler + marker;
    return record(index % 2 ? 'assistant' : 'user', content);
  });
  const trimmed = boundedHistory(history);
  const retainedPositions = [];
  for (let i = 0; i < 20; i++) if (trimmed.some(m => m.content.includes(`POSITION_${String(i + 1).padStart(2, '0')}_END`))) { retained++; retainedPositions.push(i + 1); }
  positional.push({ scenario: kind, placement, retained, total: 20, retainedPositions, bytes: Buffer.byteLength(JSON.stringify(trimmed)) });
}
let propertyChecks = 0;
for (let count = 0; count <= 30; count++) for (const word of ['abc ', 'Kế hoạch tiếng Việt ', '🙂漢字', '\\"\n\u0000']) {
  const history = Array.from({ length: count }, (_, index) => record(index % 2 ? 'assistant' : 'user', `Message-${index}: ` + word.repeat(500), { hidden: index % 11 === 7 }));
  const messages = boundedHistory(history);
  assert.ok(messages.length <= 20); assert.ok(Buffer.byteLength(JSON.stringify(messages)) <= 12000);
  for (const message of messages) assert.equal(Buffer.from(message.content).toString('utf8'), message.content);
  propertyChecks++;
}
const timings = [];
for (let i = 0; i < 250; i++) {
  const started = performance.now(); boundedHistory(cases[i % cases.length].history); timings.push(performance.now() - started);
}
const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
const report = { liveRequested: live, variants: Object.keys(variants), deterministic, positional, propertyChecks,
  followup, admissionWaitSource: 'Benchmark quota-spacing scheduler; excluded from provider timing and not application queue latency.',
  historyPreparation: { samples: timings.length, medianMs: percentile(timings, .5), p95Ms: percentile(timings, .95) }, live: [] };
console.log(JSON.stringify({ phase: 'deterministic-complete', propertyChecks, positional, historyPreparation: report.historyPreparation }));

if (live) {
  if (followup) {
    const previous = await stat(resolve(out, 'context-benchmark.json'));
    const remaining = Math.max(0, 61000 - (Date.now() - previous.mtimeMs));
    if (remaining) { console.log(JSON.stringify({ phase: 'quota-spacing-before-followup', waitMs: Math.round(remaining) })); await pause(remaining); }
  }
  const env = ai('dotenv').parse(await readFile(resolve(root, 'backend/ai-service/.env'), 'utf8'));
  assert.ok(env.LLM_BASE_URL && env.LLM_API_KEY && env.LLM_MODEL, 'Live provider must be configured');
  const configured = name => Number(env[name]) || undefined;
  const config = { LLM_MODEL: env.LLM_MODEL, CONVERSATION_AI_MODEL: env.CONVERSATION_AI_MODEL,
    CONVERSATION_AI_MAX_TOKENS: configured('CONVERSATION_AI_MAX_TOKENS'), LLM_TOKENS_PER_MINUTE: configured('LLM_TOKENS_PER_MINUTE') || 20000 };
  const rpm = Math.min(configured('LLM_REQUESTS_PER_MINUTE') || 5, 5);
  const tpm = config.LLM_TOKENS_PER_MINUTE;
  report.configuredLimits = { requestsPerMinute: rpm, tokensPerMinute: tpm };
  const ledger = []; let usage, attempts = 0, admissionEstimate;
  function stub(file, exports) {
    const id = ai.resolve(file), module = new Module(id); module.filename = id; module.loaded = true; module.exports = exports; ai.cache[id] = module;
  }
  stub('./src/config/env.config.ts', { config });
  stub('./src/infrastructure/integrations/llm.client.ts', { admitModel: async tokens => {
    admissionEstimate = tokens;
    while (true) {
      const now = performance.now(); while (ledger.length && now - ledger[0].at >= 61000) ledger.shift();
      if (ledger.length < rpm && ledger.reduce((sum, item) => sum + item.tokens, 0) + tokens <= tpm) break;
      const remaining = Math.max(1, 61000 - (now - ledger[0].at));
      console.log(JSON.stringify({ phase: 'quota-spacing', waitMs: Math.round(remaining) })); await pause(remaining);
    }
    ledger.push({ at: performance.now(), tokens });
  } });
  stub('./src/infrastructure/integrations/ai-model.provider.ts', { aiModels: {
    createChatModel(model, maxTokens) {
      const sdk = new ChatOpenAI({ model, maxTokens, apiKey: env.LLM_API_KEY, configuration: { baseURL: env.LLM_BASE_URL.replace(/\/$/, '') },
        temperature: 0.1, timeout: configured('LLM_TIMEOUT_MS') || 90000, maxRetries: 0 });
      return { bindTools(tools, options) {
        const bound = sdk.bindTools(tools, options);
        return { async *stream(messages, options) {
          assert.ok(++attempts <= (followup ? 2 : 9), 'Provider request limit');
          const stream = await bound.stream(messages, options);
          for await (const chunk of stream) { if (chunk.usage_metadata) usage = chunk.usage_metadata; yield chunk; }
        } };
      } };
    },
  } });
  const { workAnswer } = ai('./src/modules/work-assistant/work-agent.ts');
  const metrics = { open: 2, overdue: 0, dueToday: 0, completedInPeriod: 0, completedWithDeadline: 0, onTime: 0, late: 0, onTimeRate: null, deadlineBasis: 'current stored deadline' };
  const context = { scope: { audience: 'mine' }, fetchedAt: '2026-11-10T07:00:00Z', date: '2026-11-10', timeZone: 'Asia/Ho_Chi_Minh', days: 7,
    period: { from: '2026-11-04T00:00:00Z', to: '2026-11-11T00:00:00Z' }, projectIds: [], sources: { project: { state: 'ready' }, calendar: { state: 'empty' } },
    metrics: { project: metrics, personal: null, focusSeconds: 0, focusSessions: 0 }, tasks: [], detailPartial: false, busyPartial: false, focusPerTask: [], schedulingBasis: 'calendar', freeSlots: [], busy: [] };
  const orders = [['four', 'raw_twenty', 'bounded_twenty'], ['bounded_twenty', 'four', 'raw_twenty'], ['raw_twenty', 'bounded_twenty', 'four']];
  const question = 'Today, check what we chose earlier. Reply ONLY with one JSON object containing early, recent, corrected, tail, hidden, outside, open_tasks. '
    + 'For each label field copy the exact matching label from the conversation, or null if that information is not available. '
    + 'early=the chosen early plan label; recent=the recent plan label; corrected=the latest corrected preference; tail=the tail-only label; hidden=the hidden label; outside=the outside-window label. '
    + 'open_tasks must be the current number from fresh project data, never an old conversation number. Do not guess missing labels or explain the JSON.';
  for (const item of cases) for (const variant of (followup ? ['bounded_twenty'] : orders[item.round])) {
    historyModule.workHistory = variants[variant]; usage = undefined; admissionEstimate = undefined;
    const visible = variants[variant](item.history), expected = { ...expectedFor(visible, item.facts), open_tasks: 2 };
    let firstText, started, finished, answer, failed, stage = 'admission';
    const oldAdmit = ai('./src/infrastructure/integrations/llm.client.ts').admitModel;
    ai('./src/infrastructure/integrations/llm.client.ts').admitModel = async (...args) => { await oldAdmit(...args); started = performance.now(); stage = 'provider'; };
    const began = performance.now();
    try {
      const result = await workAnswer(question, item.history, context, async () => { throw new Error('Unexpected extra context lookup'); },
        AbortSignal.timeout(120000), () => {}, async () => { firstText ??= performance.now(); });
      finished = performance.now();
      const raw = result.content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
      answer = JSON.parse(raw);
    } catch (error) { finished = performance.now(); failed = { stage, type: error.constructor.name }; }
    finally { ai('./src/infrastructure/integrations/llm.client.ts').admitModel = oldAdmit; }
    const fieldResults = Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, !!answer && answer[key] === value]));
    const result = { scenario: item.kind, variant, messages: visible.length, historyBytes: Buffer.byteLength(JSON.stringify(visible)), admissionEstimate,
      firstTextMs: started && firstText ? Math.round(firstText - started) : null, completionMs: started ? Math.round(finished - started) : null,
      admissionWaitMs: started ? Math.round(started - began) : null, usage, expected, answer, fieldResults,
      visibleFactsCorrect: Object.values(fieldResults).every(Boolean), remembersOriginalEarlyFact: answer?.early === item.facts.early,
      remembersOriginalTailFact: answer?.tail === item.facts.tail, failure: failed };
    report.live.push(result); await writeFile(resolve(out, reportFile), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ phase: 'live-result', scenario: item.kind, variant, firstTextMs: result.firstTextMs, completionMs: result.completionMs,
      admissionWaitMs: result.admissionWaitMs, fieldResults, remembersOriginalEarlyFact: result.remembersOriginalEarlyFact, failure: failed }));
  }
  report.providerRequests = attempts;
  report.timingSummary = Object.fromEntries(Object.keys(variants).map(variant => {
    const samples = report.live.filter(row => row.variant === variant && !row.failure);
    return [variant, { samples: samples.length, medianFirstTextMs: percentile(samples.map(row => row.firstTextMs), .5),
      medianCompletionMs: percentile(samples.map(row => row.completionMs), .5), visibleFactsCorrect: samples.filter(row => row.visibleFactsCorrect).length }];
  }));
  historyModule.workHistory = boundedHistory;
}
await writeFile(resolve(out, live ? reportFile : 'context-deterministic.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ phase: 'complete', providerRequests: report.providerRequests || 0, timingSummary: report.timingSummary, report: out }));
