const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

function fixture(state = "COMPLETED", permitted = true, transport) {
  const requests = [],
    cancellations = [],
    invalidations = [],
    effects = [];
  const history = {
    data: {
      pages: [{ id: "session", messages: [{ content: "Private history" }] }],
    },
    isSuccess: true,
  };
  const accessState = {
    isSuccess: permitted,
    isPending: !permitted,
    isFetching: !permitted,
    error: null,
    data: { permissionStamp: "allowed" },
  };
  const refs = [];
  let refCursor = 0;
  const client = {
    invalidateQueries: async (options) => invalidations.push(options.queryKey),
    getQueryData: () => undefined,
    resetQueries: async (options) => invalidations.push(options.queryKey),
  };
  const { useWorkAssistant } = load(
    "features/work-assistant/hooks/use-work-assistant.ts",
    {
      react: {
        useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
        useState: (initial) => [initial, () => {}],
        useRef: (value) => {
          const index = refCursor++;
          if (!(index in refs)) refs[index] = { current: value };
          return refs[index];
        },
        useMemo: (factory) => factory(),
        useCallback: (callback) => callback,
        useEffect: (effect) => effects.push(effect),
      },
      "@tanstack/react-query": {
        useQueryClient: () => client,
        useQuery: (options) =>
          options.queryKey.at(-1) === "cache-access" ? accessState : {},
        useInfiniteQuery: () => history,
        useMutation: () => ({}),
      },
      "../api/work-assistant.api": {
        sendMessage: async (_session, _question, id, _context, signal) => {
          requests.push({ id, signal });
          if (transport) return transport(signal);
          throw Error("Stream disconnected");
        },
        getRequestStatus: async () => {
          if (state instanceof Error) throw state;
          return state;
        },
      },
      "../api/cancellation": {
        confirmCancellation: async () => {},
        cancelStream: async (...args) => cancellations.push(args),
      },
      "@/features/user-setting/api/user-setting.api": {
        getUserSettings: async () => ({}),
      },
    },
  );
  const assistant = useWorkAssistant("user", undefined, "projects");
  return {
    assistant,
    requests,
    cancellations,
    invalidations,
    effects,
    accessState,
    render: () => {
      refCursor = 0;
      effects.length = 0;
      return useWorkAssistant("user", undefined, "projects");
    },
  };
}

test("Retry restores a completed response without another model request", async () => {
  const { assistant, requests, invalidations } = fixture();
  await assistant.send("Question");
  await assistant.retry();
  assert.equal(requests.length, 1);
  assert.equal(invalidations.length, 2);
});

for (const state of ["RUNNING", new Error("Status unavailable")]) {
  test(`Retry cannot regenerate an unresolved previous request: ${String(state)}`, async () => {
    const { assistant, requests } = fixture(state);
    await assistant.send("Question");
    await assistant.retry();
    assert.equal(requests.length, 1);
  });
}

test("Retry uses the original idempotency ID if the previous POST was never registered", async () => {
  const { assistant, requests } = fixture("NOT_FOUND");
  await assistant.send("Question");
  await assistant.retry();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].id, requests[1].id);
});

test("a confirmed failed request can be retried explicitly with a new ID", async () => {
  const { assistant, requests } = fixture("FAILED");
  await assistant.send("Question");
  await assistant.retry();
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].id, requests[1].id);
});

test("cached content cannot be displayed or used to send while the fresh permission check is pending", async () => {
  const { assistant, requests } = fixture("COMPLETED", false);
  assert.deepEqual(assistant.messages, []);
  assert.equal(assistant.history.data, undefined);
  assert.equal(assistant.conversations.data, undefined);
  await assistant.send("Question");
  assert.equal(requests.length, 0);
});

test("closing the panel or changing its keyed context aborts the active stream and requests cancellation", async () => {
  const subject = fixture(
    "RUNNING",
    true,
    (signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Canceled", "AbortError")),
          { once: true },
        );
      }),
  );
  const cleanups = subject.effects
    .map((effect) => effect())
    .filter((cleanup) => typeof cleanup === "function");
  const pending = subject.assistant.send("Question");
  await Promise.resolve();
  assert.equal(subject.requests.length, 1);
  cleanups.forEach((cleanup) => cleanup());
  await pending;
  assert.equal(subject.requests[0].signal.aborted, true);
  assert.equal(subject.cancellations.length, 1);
});

test("a streamed permission failure keeps its status so cached content can be cleared", async () => {
  const { workAccessDenied } = load(
    "features/work-assistant/api/cache-access.ts",
  );
  const { sendMessage } = load(
    "features/work-assistant/api/work-assistant.api.ts",
    {
      "@/lib/axios": {
        api: {
          post: async () => ({
            data: new ReadableStream({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(
                    'event: error\ndata: {"status":403,"message":"Project access has changed."}\n\n',
                  ),
                );
                controller.close();
              },
            }),
          }),
        },
      },
    },
  );
  await assert.rejects(
    sendMessage(
      "session",
      "Question",
      "request",
      { contextType: "projects" },
      new AbortController().signal,
      () => {},
      () => {},
    ),
    workAccessDenied,
  );
});

test("reconnect verification preserves active work with unchanged permissions and cancels on confirmed revocation", async () => {
  const subject = fixture(
    "RUNNING",
    true,
    (signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Canceled", "AbortError")),
          { once: true },
        );
      }),
  );
  subject.effects.forEach((effect) => effect());
  const pending = subject.assistant.send("Question");
  await Promise.resolve();
  for (const state of [
    { isSuccess: false, isFetching: true },
    { isSuccess: true, isFetching: false },
  ]) {
    Object.assign(subject.accessState, state);
    subject.render();
    subject.effects.forEach((effect) => effect());
    assert.equal(subject.requests[0].signal.aborted, false);
  }
  subject.accessState.data = { permissionStamp: "revoked" };
  subject.render();
  subject.effects.forEach((effect) => effect());
  await pending;
  assert.equal(subject.requests[0].signal.aborted, true);
  assert.equal(subject.cancellations.length, 1);
});
