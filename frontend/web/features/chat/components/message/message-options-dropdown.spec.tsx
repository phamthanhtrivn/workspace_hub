import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { MessageOptionsDropdown } from "./message-options-dropdown";

test("Reply in thread yields menu focus while ordinary dismissal still restores it", (context) => {
  context.mock.method(React, "useRef", (current: unknown) => ({ current }));
  context.mock.method(React, "useEffect", (effect: React.EffectCallback) => { effect(); });
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  globalThis.document = {} as Document;
  globalThis.window = { innerHeight: 800 } as Window & typeof globalThis;
  context.after(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });
  const order: string[] = [];
  function menu() {
    return MessageOptionsDropdown({ isOpen: true, isMe: false, buttonRect: { bottom: 100, width: 20 } as DOMRect,
      anchorElementRef: { current: null }, onClose: () => { order.push("close"); },
      onThreadReply: () => { order.push("reply"); }, onCopy: () => { order.push("copy"); } }) as React.ReactElement<{
        restoreFocus: () => boolean; children: React.ReactNode;
      }>;
  }
  const replyMenu = menu();
  assert.equal(replyMenu.props.restoreFocus(), true);
  const entries = React.Children.toArray(replyMenu.props.children) as React.ReactElement<{ onClick: () => void }>[];
  entries[0].props.onClick();
  assert.deepEqual(order, ["reply", "close"]);
  assert.equal(replyMenu.props.restoreFocus(), false, "closing the menu must not steal focus from the composer");
  const nextMenu = menu();
  assert.equal(nextMenu.props.restoreFocus(), true, "opening the menu again resets focus restoration");
  const nextEntries = React.Children.toArray(nextMenu.props.children) as React.ReactElement<{ onClick: () => void }>[];
  nextEntries[1].props.onClick();
  assert.equal(nextMenu.props.restoreFocus(), true);
});
