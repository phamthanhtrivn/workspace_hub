import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import * as storeHooks from "@/store/store";
import { useThreadComposerFocus } from "./useThreadComposerFocus";
import reducer, { setActiveChat, setActiveThreadRootMessage } from "@/store/chat/chat-slice";
import { ChatContextType } from "../../types/chat.types";

for (const chatType of [ChatContextType.CHANNEL, ChatContextType.DIRECT_MESSAGE] as const) {
  test(`${chatType}: thread focus survives popup cleanup, retains a draft and cancels on unmount`, (context) => {
    let chat = reducer(undefined, setActiveChat({ chatId: "chat", chatType }));
    const thread = { messageId: "thread", chatId: "chat", chatType };
    chat = reducer(chat, setActiveThreadRootMessage(thread));
    const effects: React.EffectCallback[] = [];
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    let focusTarget = "menu";
    const focusCalls: FocusOptions[] = [];
    context.mock.method(storeHooks, "useAppSelector", ((select: (state: { chat: typeof chat }) => unknown) => select({ chat })) as typeof storeHooks.useAppSelector);
    context.mock.method(React, "useEffect", (effect: React.EffectCallback) => { effects.push(effect); });
    const originalFrame = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame; };
    globalThis.cancelAnimationFrame = (frame) => { frames.delete(frame); };
    context.after(() => {
      globalThis.requestAnimationFrame = originalFrame;
      globalThis.cancelAnimationFrame = originalCancel;
    });
    const textarea = { isConnected: true, disabled: false, value: "Unsent reply", selectionStart: 5,
      focus(options: FocusOptions) { focusTarget = "thread"; focusCalls.push(options); } };
    const ref = { current: textarea as unknown as HTMLTextAreaElement };
    useThreadComposerFocus(ref, "thread");
    let dispose = effects.pop()!();
    assert.equal(focusTarget, "thread");
    focusTarget = "modal-opener";
    frames.get(nextFrame)!(0);
    assert.equal(focusTarget, "thread", "composer wins after a closing modal restores its opener");
    assert.deepEqual(focusCalls, [{ preventScroll: true }, { preventScroll: true }]);
    if (typeof dispose === "function") dispose();
    assert.equal(frames.size, 0);

    chat = reducer(chat, setActiveThreadRootMessage(thread));
    focusTarget = "message";
    useThreadComposerFocus(ref, "thread");
    dispose = effects.pop()!();
    assert.equal(focusTarget, "thread");
    assert.equal(textarea.value, "Unsent reply");
    assert.equal(textarea.selectionStart, 5);
    if (typeof dispose === "function") dispose();
    assert.equal(frames.size, 0, "unmount cancels late focus");

    focusTarget = "other-chat";
    useThreadComposerFocus(ref, "unrelated-thread");
    effects.pop()!();
    assert.equal(focusTarget, "other-chat");
    assert.equal(frames.size, 0);
  });
}
