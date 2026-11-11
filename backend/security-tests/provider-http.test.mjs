import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire, Module } from 'node:module';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true } });
const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
const id = require.resolve('./src/config/env.config.ts'), configModule = new Module(id);
configModule.filename = id; configModule.loaded = true;
configModule.exports = { config: { LLM_TIMEOUT_MS: 90000 } };
require.cache[id] = configModule;
const { providerFetch, closeProviderConnections, isProviderConnectTimeout } = require('./src/infrastructure/integrations/provider-http.ts');
after(closeProviderConnections);

function connectionTimeout() {
  return new TypeError('fetch failed', { cause: Object.assign(new Error('connect timed out'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) });
}
async function withFetch(fake, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await run(); } finally { globalThis.fetch = original; }
}

test('a connect timeout gets one new connection attempt with the same JSON body and deadline', async () => {
  const calls = [], response = new Response('ok');
  await withFetch(async (input, init) => {
    calls.push({ input, init });
    if (calls.length === 1) throw connectionTimeout();
    return response;
  }, async () => {
    assert.equal(await providerFetch('https://provider.invalid/chat/completions', { method: 'POST', body: '{"test":true}' }), response);
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.body, calls[1].init.body);
  assert.equal(calls[0].init.signal, calls[1].init.signal);
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(typeof calls[0].init.dispatcher.dispatch, 'function');
});

test('repeated connection failure stops after three attempts', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; throw connectionTimeout(); }, async () => {
    await assert.rejects(providerFetch('https://provider.invalid', { method: 'POST', body: '{}' }));
  });
  assert.equal(calls, 3);
});

test('OS connect ETIMEDOUT is retried, but read/write timeouts are not connect failures', async () => {
  const error = new TypeError('fetch failed', { cause: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT', syscall: 'connect' }) });
  assert.equal(isProviderConnectTimeout(error), true);
  for (const syscall of ['read', 'write', undefined]) {
    assert.equal(isProviderConnectTimeout({ cause: { code: 'ETIMEDOUT', syscall } }), false);
  }
  let calls = 0;
  await withFetch(async () => { if (++calls === 1) throw error; return new Response('ok'); }, async () => {
    assert.equal(await (await providerFetch('https://provider.invalid', { method: 'POST', body: '{}' })).text(), 'ok');
  });
  assert.equal(calls, 2);
});

test('unknown connection outcomes are never replayed', async () => {
  for (const code of ['ECONNRESET', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT']) {
    let calls = 0;
    const error = new TypeError('fetch failed', { cause: Object.assign(new Error('network error'), { code }) });
    await withFetch(async () => { calls++; throw error; }, async () => {
      await assert.rejects(providerFetch('https://provider.invalid', { method: 'POST', body: '{}' }), candidate => candidate === error);
    });
    assert.equal(calls, 1, code);
  }
});

test('HTTP errors and broken response streams are not replayed', async () => {
  for (const status of [400, 429, 500, 503]) {
    let calls = 0;
    await withFetch(async () => { calls++; return new Response('error', { status }); }, async () => {
      assert.equal((await providerFetch('https://provider.invalid')).status, status);
    });
    assert.equal(calls, 1);
  }
  let calls = 0;
  await withFetch(async () => {
    calls++;
    return new Response(new ReadableStream({ start(controller) { controller.error(new Error('stream interrupted')); } }));
  }, async () => {
    const response = await providerFetch('https://provider.invalid');
    await assert.rejects(response.text(), /stream interrupted/);
  });
  assert.equal(calls, 1);
});

test('cancellation prevents both initial calls and connection retries', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return new Response('ok'); }, async () => {
    await assert.rejects(providerFetch('https://provider.invalid', { signal: AbortSignal.abort() }));
  });
  assert.equal(calls, 0);
  const controller = new AbortController();
  await withFetch(async () => { calls++; controller.abort(); throw connectionTimeout(); }, async () => {
    await assert.rejects(providerFetch('https://provider.invalid', { signal: controller.signal }));
  });
  assert.equal(calls, 1);
});

test('Request and streaming bodies are never replayed', async () => {
  for (const [input, init] of [
    [new Request('https://provider.invalid', { method: 'POST', body: '{}' }), undefined],
    ['https://provider.invalid', { method: 'POST', body: new ReadableStream() }],
  ]) {
    let calls = 0;
    await withFetch(async () => { calls++; throw connectionTimeout(); }, async () => {
      await assert.rejects(providerFetch(input, init));
    });
    assert.equal(calls, 1);
  }
});
