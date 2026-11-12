import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023' } });
const require = createRequire(import.meta.url);
const original = Module._load;
let states, answer, cancel;
const react = {
  useRef: value => ({ current: value }),
  useCallback: callback => callback,
  useEffect: () => {},
  useState: initial => {
    const index = states.length;
    states.push(initial);
    return [initial, value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  },
};
Module._load = function(id, parent, main) {
  if (id === 'react') return react;
  if (id === '@tanstack/react-query' || id === '@/store/store') return {};
  if (id === '../api/notebooks.api') return { notebooksApi: { answer: (...args) => answer(...args), cancel: (...args) => cancel(...args) } };
  return original.call(this, id, parent, main);
};
let useNotebookChat;
try { ({ useNotebookChat } = require('../../frontend/web/features/ai/hooks/use-notebook.ts')); }
finally { Module._load = original; }
const sources = [{ id: 'source', revision: 'revision' }];
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('Stop keeps the active slot until server cancellation finishes, even after stream cleanup', async () => {
  states = [];
  let answers = 0, cancellations = 0, emit;
  const pending = deferred();
  cancel = () => { cancellations++; return pending.promise; };
  answer = async (_id, _question, _sources, _request, signal, onEvent) => {
    if (++answers > 1) return;
    emit = onEvent;
    await new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true }));
  };
  const chat = useNotebookChat('notebook', async () => {});
  const first = chat.ask('first', sources);
  chat.cancel();
  chat.cancel();
  await first;
  emit({ event: 'delta', data: { text: 'late content' } });
  assert.equal(states[0], null);
  assert.equal(states[2], true, 'stream finally must not unlock the UI');
  await chat.ask('second', sources);
  assert.equal(answers, 1);
  assert.equal(cancellations, 1);
  pending.resolve();
  await flush();
  assert.equal(states[2], false);
  await chat.ask('second', sources);
  assert.equal(answers, 2);
});

test('failed cancellation stays blocked and Stop can retry without resending the model request', async () => {
  states = [];
  let answers = 0, cancellations = 0;
  cancel = async () => { if (++cancellations === 1) throw new Error('Network unavailable'); };
  answer = async (_id, _question, _sources, _request, signal) => {
    if (++answers > 1) return;
    await new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  };
  const chat = useNotebookChat('notebook', async () => {});
  const first = chat.ask('first', sources);
  chat.cancel();
  await first;
  await flush();
  assert.equal(states[2], true);
  assert.match(states[3], /Unable to confirm cancellation/);
  await chat.ask('second', sources);
  assert.equal(answers, 1);
  chat.cancel();
  await flush();
  assert.equal(states[2], false);
  await chat.ask('second', sources);
  assert.equal(answers, 2);
  assert.equal(cancellations, 2);
});

test('a previous refresh cannot clear or overwrite a new question after Stop', async () => {
  for (const refreshFails of [false, true]) {
    states = [];
    let answers = 0, refreshes = 0;
    const previousRefresh = deferred();
    const nextAnswer = deferred();
    answer = async () => { if (++answers === 2) await nextAnswer.promise; };
    cancel = async () => {};
    const chat = useNotebookChat('notebook', () => ++refreshes === 1 ? previousRefresh.promise : Promise.resolve());
    const first = chat.ask('first', sources);
    await flush();
    chat.cancel();
    await flush();
    const second = chat.ask('second', sources);
    if (refreshFails) previousRefresh.reject(new Error('Refresh failed'));
    else previousRefresh.resolve();
    await first;
    assert.equal(states[0].question, 'second');
    assert.equal(states[2], true);
    assert.equal(states[3], '');
    nextAnswer.resolve();
    await second;
  }
});
