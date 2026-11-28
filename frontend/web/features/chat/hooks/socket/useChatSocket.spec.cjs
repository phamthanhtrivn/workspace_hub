const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const query = require("@tanstack/react-query");
const { createSourceLoader } = require("../../../../../../tests/support/typescript.cjs");
const { chatKeys } = require("../../types/chat.constant.ts");
const { ChatEvent } = require("../../api/chat.events.ts");

test("a Channel settings event causes one shared refetch, and remounting removes the old listener", async () => {
  const client = new query.QueryClient({ defaultOptions: { queries: { retry: false } } });
  const listeners = new Map(), cleanups = [];
  const socket = {
    connected: false,
    on: (event, handler) => {
      const handlers = listeners.get(event) ?? new Set();
      handlers.add(handler); listeners.set(event, handlers);
    },
    off: (event, handler) => listeners.get(event)?.delete(handler),
  };
  const load = createSourceLoader(path.resolve(__dirname, "../../../.."));
  const { useChatSocket } = load("features/chat/hooks/socket/useChatSocket.ts", {
    react: { ...React, useRef: value => ({ current: value }), useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); } },
    "next/navigation": { usePathname: () => "/documents" },
    "@tanstack/react-query": { ...query, useQueryClient: () => client },
    "@/store/store": { useAppSelector: selector => selector({ auth: { userId: "owner", accessToken: "test-token" }, chat: { activeChatId: null } }), useAppDispatch: () => () => {} },
    "../../api/chat-socket.service": { socketService: { connect: () => socket } },
  });
  let requests = 0;
  const options = { queryKey: chatKeys.channels("space"), staleTime: Infinity, queryFn: async () => { requests++; return { channels: [{ id: "channel" }] }; } };
  const observers = [new query.QueryObserver(client, options), new query.QueryObserver(client, options)];
  const unsubscribers = [];
  try {
    await client.fetchQuery(options);
    unsubscribers.push(...observers.map(observer => observer.subscribe(() => {})));
    useChatSocket();
    cleanups.splice(0).forEach(cleanup => cleanup());
    useChatSocket();
    assert.equal(listeners.get(ChatEvent.CHANNEL_SETTING_UPDATED).size, 1);
    for (const handler of listeners.get(ChatEvent.CHANNEL_SETTING_UPDATED)) handler({ channelId: "channel", spaceId: "space", setting: { allowSendMessage: false } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests, 2, "one initial request and one refetch for both observers");
  } finally {
    cleanups.forEach(cleanup => cleanup());
    unsubscribers.forEach(unsubscribe => unsubscribe());
    observers.forEach(observer => observer.destroy());
    client.clear();
  }
  assert.equal(listeners.get(ChatEvent.CHANNEL_SETTING_UPDATED).size, 0);
});
