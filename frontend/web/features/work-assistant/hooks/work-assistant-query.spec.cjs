const { test, after } = require("node:test");
const assert = require("node:assert/strict");

// Exercise Query Core's browser timers without opening a browser or using a network.
const originalWindow = globalThis.window;
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const {
  InfiniteQueryObserver,
  QueryClient,
  focusManager,
  onlineManager,
} = require("@tanstack/react-query");
const {
  WORK_ASSISTANT_READ_POLICY,
} = require("../constants/work-assistant-query.ts");
const { aiErrorMessage } = require("../../../lib/ai-feedback.ts");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check) {
  const deadline = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > deadline) assert.fail("Query state did not settle");
    await pause(5);
  }
}
after(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

function clientFor(t) {
  const previousFocus = focusManager.isFocused();
  const previousOnline = onlineManager.isOnline();
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 1,
        refetchInterval: 5,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
      },
    },
  });
  client.mount();
  t.after(() => {
    client.unmount();
    client.clear();
    focusManager.setFocused(previousFocus);
    onlineManager.setOnline(previousOnline);
  });
  return client;
}

test("failed history reads wait for explicit retry or reopening, including focus and reconnect", async (t) => {
  const client = clientFor(t);
  let calls = 0;
  const options = {
    ...WORK_ASSISTANT_READ_POLICY,
    queryKey: ["work-assistant", "user-a", "projects:", "history", "latest"],
    initialPageParam: undefined,
    queryFn: async () => {
      calls++;
      throw new Error("name resolution failed");
    },
    getNextPageParam: () => undefined,
  };
  const observer = new InfiniteQueryObserver(client, options);
  let unsubscribe = observer.subscribe(() => {});
  t.after(() => unsubscribe());
  await until(() => observer.getCurrentResult().isError);
  await pause(40);
  assert.equal(calls, 1, "neither retry nor polling may repeat a failed GET");
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  onlineManager.setOnline(false);
  onlineManager.setOnline(true);
  await pause(40);
  assert.equal(calls, 1, "focus/reconnect must not repeat a failed GET");
  await observer.refetch();
  await pause(30);
  assert.equal(calls, 2, "one click on Retry makes exactly one request");
  unsubscribe();
  await until(() => client.getQueryCache().getAll().length === 0);
  const reopened = new InfiniteQueryObserver(client, options);
  unsubscribe = reopened.subscribe(() => {});
  await until(() => reopened.getCurrentResult().isError);
  assert.equal(calls, 3, "explicit reopening starts a fresh read");
});

test("manual paging works and closed history cannot leak into another account/context", async (t) => {
  const client = clientFor(t);
  const pages = [];
  const options = {
    ...WORK_ASSISTANT_READ_POLICY,
    queryKey: ["work-assistant", "user-a", "projects:", "history", "latest"],
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      pages.push(pageParam);
      return {
        messages: ["user-a private message"],
        nextCursor: pageParam ? undefined : "older",
      };
    },
    getNextPageParam: (page) => page.nextCursor,
  };
  const first = new InfiniteQueryObserver(client, options);
  const unsubscribe = first.subscribe(() => {});
  t.after(unsubscribe);
  await until(() => first.getCurrentResult().isSuccess);
  await first.fetchNextPage();
  assert.deepEqual(pages, [undefined, "older"]);
  assert.equal(first.getCurrentResult().data.pages.length, 2);
  unsubscribe();
  await until(() => client.getQueryCache().getAll().length === 0);
  const second = new InfiniteQueryObserver(client, {
    ...options,
    queryKey: ["work-assistant", "user-b", "calendar:", "history", "latest"],
    queryFn: async () => ({
      messages: ["user-b message"],
      nextCursor: undefined,
    }),
  });
  assert.equal(second.getCurrentResult().data, undefined);
  const stop = second.subscribe(() => {});
  t.after(stop);
  await until(() => second.getCurrentResult().isSuccess);
  assert.deepEqual(second.getCurrentResult().data.pages[0].messages, [
    "user-b message",
  ]);
});

test("gateway 502/503 feedback is actionable while specific AI diagnostics are retained", () => {
  for (const status of [502, 503]) {
    const error = {
      isAxiosError: true,
      response: { status, data: { message: "name resolution failed" } },
    };
    assert.match(
      aiErrorMessage(error, "fallback"),
      /AI is temporarily unavailable/,
    );
    assert.match(aiErrorMessage(error, "fallback"), /services are running/);
  }
  assert.match(
    aiErrorMessage(
      {
        isAxiosError: true,
        response: { status: 503, data: { message: "AI_DATABASE_UNAVAILABLE" } },
      },
      "fallback",
    ),
    /AI database is unavailable/,
  );
});
