import assert from "node:assert/strict";
import { test } from "node:test";
import reducer, { patchActiveThreadRootMessage, setActiveChat, setActiveThreadRootMessage } from "./chat-slice";
import { ChatContextType, type ChatMessageResponse } from "@/features/chat/types/chat.types";

for (const chatType of [ChatContextType.CHANNEL, ChatContextType.DIRECT_MESSAGE] as const) {
  test(`${chatType}: opening or reselecting a thread requests focus without replacing its identity`, () => {
    let state = reducer(undefined, setActiveChat({ chatId: "chat", chatType }));
    const rootMessage: ChatMessageResponse = { id: "thread", chatId: "chat", chatType, senderId: "sender", content: "Root", type: "TEXT", createdAt: "2026-11-08T00:00:00Z" };
    state = reducer(state, setActiveThreadRootMessage(rootMessage));
    const firstRequest = state.threadFocusRequest;
    assert.equal(firstRequest, 1);
    state = reducer(state, setActiveThreadRootMessage(rootMessage));
    assert.equal(state.threadFocusRequest, firstRequest + 1);
    assert.equal(state.activeThreadRootMessageId, "thread");
    assert.equal(state.activeThreadRootMessage, rootMessage);
    state = reducer(state, patchActiveThreadRootMessage({ id: "thread", content: "Updated" }));
    assert.equal(state.threadFocusRequest, firstRequest + 1, "socket/cache updates must not steal focus");
    state = reducer(state, setActiveThreadRootMessage(null));
    assert.equal(state.activeThreadRootMessageId, null);
    assert.equal(state.threadFocusRequest, firstRequest + 1, "closing does not request composer focus");
  });
}
