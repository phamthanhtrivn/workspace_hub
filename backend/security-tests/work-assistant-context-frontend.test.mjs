import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, jsx: 'react-jsx' } });
tooling('tsconfig-paths').register({ baseUrl: fileURLToPath(new URL('../../frontend/web/', import.meta.url)), paths: { '@/*': ['./*'] } });
const web = createRequire(new URL('../../frontend/web/package.json', import.meta.url));
const { JSDOM } = web('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const name of ['window', 'document', 'navigator', 'HTMLElement'])
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.HTMLElement.prototype.scrollTo = function () {};
function stub(file, exports) {
  const id = web.resolve(file), entry = new Module(id);
  entry.filename = id; entry.loaded = true; entry.exports = exports; web.cache[id] = entry;
}
const React = web('react');
const { render, fireEvent, act, waitFor, cleanup } = web('@testing-library/react');
const { QueryClient, QueryClientProvider } = web('@tanstack/react-query');
let pathname, userId = 'actor', records, calls, gates, streams;
const projectA = randomUUID(), projectB = randomUUID();
function key(context) { return context.contextType + ':' + (context.projectId ?? ''); }
function seed(context, label) {
  const session = { id: randomUUID(), ...context, projectId: context.projectId ?? null, nextCursor: null,
    messages: label ? [{ id: randomUUID(), role: 'user', content: label, sources: [], created_at: new Date().toISOString() }] : [] };
  const list = records.get(key(context)) ?? []; list.unshift(session); records.set(key(context), list);
  return session;
}
stub('next/navigation', { usePathname: () => pathname });
stub('next/dynamic', { __esModule: true, default: () => props => React.createElement(web('./features/work-assistant/components/work-assistant-panel.tsx').default, props) });
stub('./store/store.ts', { useAppSelector: () => userId });
stub('./components/ui/dialog.tsx', { DialogPortal: ({ children }) => children });
stub('./components/ui/sheet.tsx', { SheetPanel: ({ children, onClose: _close, modal: _modal, open: _open, ...props }) => React.createElement('section', props, children) });
stub('./components/ui/use-media-query.ts', { useMediaQuery: () => false });
stub('./features/user-setting/api/user-setting.api.ts', { getUserSettings: async () => ({ data: { timezone: 'UTC' } }) });
stub('./lib/axios.ts', { api: {
  get: async (path, options) => {
    const context = options.params; calls.push({ path, context, signal: options.signal });
    await gates.get?.(path, context);
    let list = records.get(key(context));
    if (!list?.length) { seed(context); list = records.get(key(context)); }
    let data = path.endsWith('/sessions') ? { sessions: list.map(s => ({ ...s, title: s.messages[0]?.content ?? 'New conversation', updatedAt: new Date().toISOString() })), nextCursor: null }
      : list.find(s => !context.sessionId || s.id === context.sessionId);
    if (context.before) data = { ...data, messages: [], nextCursor: null };
    return { data: { data } };
  },
  post: async (path, payload, options) => {
    calls.push({ path, payload });
    if (path.endsWith('/cancel')) { await gates.cancel?.(path); return {}; }
    if (path.endsWith('/sessions')) { const data = seed(payload); await gates.create?.(); return { data: { data } }; }
    const stream = { payload, signal: options.signal };
    const data = new ReadableStream({ start(controller) {
      stream.controller = controller;
      options.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
    } });
    streams.push(stream);
    return { data };
  },
} });
const Launcher = web('./features/work-assistant/components/work-assistant-launcher.tsx').default;
const encoder = new TextEncoder();
function emit(stream, event, data) { stream.controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
function deferred() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }
function mount() {
  pathname = '/dashboard'; userId = 'actor'; records = new Map(); calls = []; gates = {}; streams = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  const element = () => React.createElement(QueryClientProvider, { client }, React.createElement(Launcher));
  const view = render(element());
  return { ...view, client, navigate: path => { pathname = path; view.rerender(element()); }, refresh: () => { view.unmount(); return render(element()); } };
}
async function open(view) { fireEvent.click(view.getByRole('button', { name: 'Open AI Assistant', exact: true })); await ready(view); }
async function ready(view) { await waitFor(() => assert.equal(view.getByRole('button', { name: 'New conversation' }).disabled, false)); }
function contents(view) { return view.getByRole('log', { name: 'Conversation history' }).textContent.replace(/^You/, ''); }
function send(view, question) { fireEvent.change(view.getByRole('textbox', { name: 'Question for AI Assistant' }), { target: { value: question } }); fireEvent.click(view.getByRole('button', { name: 'Send question' })); }

test('open panel follows all page contexts, project IDs and revisits without creating duplicates', async () => {
  const view = mount();
  const routes = [
    ['/dashboard', { contextType: 'dashboard' }], ['/projects', { contextType: 'projects' }],
    ['/calendar', { contextType: 'calendar' }], [`/projects/${projectA}`, { contextType: 'project_detail', projectId: projectA }],
    [`/projects/${projectB}`, { contextType: 'project_detail', projectId: projectB }],
  ];
  try {
    for (const [route, context] of routes) seed(context, 'ONLY ' + route);
    await open(view);
    for (const [route] of [...routes, ...routes.toReversed()]) {
      view.navigate(route); await ready(view);
      assert.equal(contents(view), 'ONLY ' + route);
      assert.equal(view.getAllByRole('button', { name: 'Close AI Assistant', exact: true }).length, 2);
    }
    assert.equal(records.size, 5);
    assert.equal([...records.values()].every(list => list.length === 1), true);
    view.navigate(`/projects/${projectA}`); await ready(view);
    const last = calls.length;
    view.navigate(`/projects/${projectA}/tasks`); await ready(view);
    assert.equal(calls.length, last, 'navigation inside the same project preserves the conversation');
  } finally { cleanup(); view.client.clear(); }
});

test('New Conversation stays in the current context; refresh and revisit restore latest rather than selected older history', async () => {
  const view = mount(); let refreshed;
  try {
    const old = seed({ contextType: 'dashboard' }, 'OLDER DASHBOARD');
    seed({ contextType: 'dashboard' }, 'LATEST DASHBOARD');
    seed({ contextType: 'calendar' }, 'ONLY CALENDAR');
    await open(view); assert.equal(contents(view), 'LATEST DASHBOARD');
    fireEvent.click(view.getByRole('button', { name: 'Conversations', exact: true }));
    fireEvent.click(await view.findByRole('button', { name: /OLDER DASHBOARD/ })); await ready(view);
    assert.equal(contents(view), 'OLDER DASHBOARD');
    view.navigate('/calendar'); await ready(view); assert.equal(contents(view), 'ONLY CALENDAR');
    view.navigate('/dashboard'); await ready(view); assert.equal(contents(view), 'LATEST DASHBOARD');
    fireEvent.click(view.getByRole('button', { name: 'New conversation' }));
    await view.findByText('What would you like to work on?'); await ready(view);
    assert.equal(records.get('dashboard:').length, 3);
    assert.equal(records.get('calendar:').length, 1);
    const created = records.get('dashboard:')[0]; assert.notEqual(created.id, old.id);
    assert.deepEqual(calls.find(c => c.path.endsWith('/sessions') && c.payload)?.payload, { contextType: 'dashboard' });
    refreshed = view.refresh(); await open(refreshed);
    assert.ok(contents(refreshed).includes('What would you like to work on?'));
    assert.equal(records.get('dashboard:').length, 3);
  } finally { cleanup(); view.client.clear(); }
});

test('switching during streaming cancels old request, waits for cancellation and isolates query invalidation', async () => {
  const view = mount(), cancel = deferred();
  try {
    seed({ contextType: 'dashboard' }, 'DASHBOARD HISTORY'); seed({ contextType: 'calendar' }, 'CALENDAR HISTORY');
    await open(view); send(view, 'dashboard question');
    await waitFor(() => assert.equal(streams.length, 1)); const old = streams[0];
    act(() => emit(old, 'delta', { text: 'DASHBOARD DRAFT' })); await view.findByText('DASHBOARD DRAFT');
    gates.cancel = () => cancel.promise;
    view.navigate('/calendar'); await ready(view);
    assert.equal(old.signal.aborted, true); assert.equal(contents(view), 'CALENDAR HISTORY');
    send(view, 'calendar question');
    await act(async () => {}); assert.equal(streams.length, 1, 'new request waits for old server cancellation');
    await act(async () => cancel.release());
    await waitFor(() => assert.equal(streams.length, 2)); const current = streams[1];
    assert.equal(current.payload.contextType, 'calendar'); assert.equal(current.payload.audience, 'calendar');
    const invalidations = [], original = view.client.invalidateQueries.bind(view.client);
    view.client.invalidateQueries = filter => { invalidations.push(filter.queryKey); return original(filter); };
    const answer = { id: randomUUID(), role: 'assistant', content: 'CALENDAR ANSWER', sources: [], created_at: new Date().toISOString() };
    records.get('calendar:')[0].messages.push(answer);
    await act(async () => { emit(current, 'done', { message: answer }); current.controller.close(); });
    await ready(view); await view.findByText('CALENDAR ANSWER');
    assert.equal(contents(view).includes('DASHBOARD'), false);
    assert.ok(invalidations.length >= 2); assert.ok(invalidations.every(k => k[2] === 'calendar:'));
  } finally { cancel.release(); cleanup(); view.client.clear(); }
});

test('late history loads and late New Conversation results cannot overwrite the active page', async () => {
  const view = mount(), history = deferred(), creation = deferred();
  try {
    seed({ contextType: 'dashboard' }, 'DASHBOARD'); seed({ contextType: 'calendar' }, 'CALENDAR'); seed({ contextType: 'projects' }, 'PROJECTS');
    await open(view);
    gates.get = (_path, ctx) => ctx.contextType === 'calendar' ? history.promise : undefined;
    view.navigate('/calendar'); await waitFor(() => assert.ok(calls.some(c => c.context?.contextType === 'calendar')));
    view.navigate('/projects'); await ready(view); assert.equal(contents(view), 'PROJECTS');
    await act(async () => history.release()); assert.equal(contents(view), 'PROJECTS');
    gates.create = () => creation.promise;
    fireEvent.click(view.getByRole('button', { name: 'New conversation' }));
    await waitFor(() => assert.ok(calls.some(c => c.payload?.contextType === 'projects')));
    view.navigate('/dashboard'); await ready(view); assert.equal(contents(view), 'DASHBOARD');
    await act(async () => creation.release()); assert.equal(contents(view), 'DASHBOARD');
    assert.equal(records.get('projects:').length, 2);
  } finally { history.release(); creation.release(); cleanup(); view.client.clear(); }
});

test('earlier messages stay pinned to the loaded conversation when another tab changes the latest session', async () => {
  const view = mount();
  try {
    const original = seed({ contextType: 'dashboard' }, 'CURRENT HISTORY');
    original.nextCursor = original.messages[0].id;
    await open(view);
    seed({ contextType: 'dashboard' }, 'NEWER FROM ANOTHER TAB');
    fireEvent.click(view.getByRole('button', { name: 'Earlier messages' }));
    await waitFor(() => assert.ok(calls.some(c => c.context?.before)));
    const earlier = calls.find(c => c.context?.before);
    assert.equal(earlier.context.sessionId, original.id);
    assert.equal(earlier.context.contextType, 'dashboard');
    assert.equal(contents(view), 'CURRENT HISTORY');
  } finally { cleanup(); view.client.clear(); }
});

test('rapid navigation keeps waiting for the original cancellation even when an unsent intermediate request has no server row', async () => {
  const view = mount(), cancel = deferred();
  try {
    seed({ contextType: 'dashboard' }, 'DASHBOARD'); seed({ contextType: 'calendar' }, 'CALENDAR'); seed({ contextType: 'projects' }, 'PROJECTS');
    await open(view); send(view, 'first question');
    await waitFor(() => assert.equal(streams.length, 1)); const first = streams[0];
    gates.cancel = path => path.includes(first.payload.requestId) ? cancel.promise : Promise.reject(new Error('Request not registered'));
    view.navigate('/calendar'); await ready(view); send(view, 'unsent second question');
    view.navigate('/projects'); await ready(view); send(view, 'third question');
    await act(async () => {}); assert.equal(streams.length, 1);
    assert.equal(contents(view).includes('first question'), false);
    await act(async () => cancel.release());
    await waitFor(() => assert.equal(streams.length, 2));
    assert.equal(streams[1].payload.contextType, 'projects');
    assert.equal(streams[1].payload.question, 'third question');
  } finally { cancel.release(); cleanup(); view.client.clear(); }
});
