const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../../.."));

function fixture(read, isPending = false) {
  const calls = [],
    states = [],
    effects = [];
  const { useAttachmentSummary } = load(
    "features/chat/hooks/message/useAttachmentSummary.ts",
    {
      react: {
        ...React,
        useRef: (value) => ({ current: value }),
        useCallback: (callback) => callback,
        useState: (initial) => [initial, (value) => states.push(value)],
        useEffect: (effect) => effects.push(effect),
      },
      "@tanstack/react-query": {
        useMutation: (options) => ({
          isPending,
          mutateAsync: options.mutationFn,
          reset() {},
        }),
      },
      "@/store/store": {
        useAppSelector: (selector) => selector({ auth: { userId: "owner" } }),
        store: { getState: () => ({ auth: { userId: "owner" } }) },
      },
      sonner: { toast: { success() {}, error() {} } },
      "../../api/attachment-summary.api": {
        requestAttachmentSummary: async (...args) => {
          calls.push(args);
          return read();
        },
      },
    },
  );
  return {
    hook: useAttachmentSummary({
      id: "source",
      channelId: "chat",
      threadParentId: "thread",
    }),
    calls,
    states,
    effects,
  };
}

test("duplicate clicks share the pending HTTP request; regeneration is an explicit new action", async () => {
  const result = Promise.withResolvers();
  const subject = fixture(() => result.promise);
  const first = subject.hook.summarize({ id: "file", name: "report.pdf" });
  await subject.hook.summarize({ id: "file", name: "report.pdf" });
  assert.equal(subject.calls.length, 1);
  result.resolve({
    reused: true,
    status: "COMPLETED",
    reply: { id: "reply", content: "Saved summary" },
  });
  await first;
  assert.equal(
    subject.states.at(-1).completed.receipt.reply.content,
    "Saved summary",
  );
  await subject.hook.summarize({ id: "file", name: "report.pdf" }, true);
  assert.equal(subject.calls.length, 2);
  assert.equal(subject.calls[1][2].regenerate, true);
  assert.notEqual(subject.calls[0][2].actionId, subject.calls[1][2].actionId);
});

test("idle messages install no global notification listener and revoked access suppresses late cached content", async () => {
  const previous = globalThis.window;
  const listeners = new Map();
  globalThis.window = {
    addEventListener: (event, listener) => listeners.set(event, listener),
    removeEventListener: (event) => listeners.delete(event),
  };
  const cleanups = [];
  try {
    for (const effect of fixture(async () => ({})).effects)
      cleanups.push(effect());
    assert.equal(listeners.size, 0);
    const result = Promise.withResolvers(),
      subject = fixture(() => result.promise, true);
    for (const effect of subject.effects) cleanups.push(effect());
    const pending = subject.hook.summarize({ id: "file", name: "report.pdf" });
    assert.equal(listeners.size, 1);
    [...listeners.values()][0]({ detail: { type: "DOCUMENT_SHARE_REMOVED" } });
    result.resolve({
      reused: true,
      status: "COMPLETED",
      reply: { id: "reply", content: "Private content" },
    });
    await pending;
    assert.ok(subject.states.every((state) => state.completed === null));
  } finally {
    cleanups
      .filter((cleanup) => typeof cleanup === "function")
      .forEach((cleanup) => cleanup());
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test("summary preview uses the shared dialog and exposes an explicit Generate again action", () => {
  const Surface = (props) => React.createElement("div", null, props.children);
  const { AttachmentSummaryDialog } = load(
    "features/chat/components/message/attachment-summary-dialog.tsx",
    {
      "@/components/ui/dialog": Object.fromEntries(
        [
          "Dialog",
          "DialogContent",
          "DialogHeader",
          "DialogTitle",
          "DialogDescription",
          "DialogFooter",
        ].map((name) => [name, Surface]),
      ),
    },
  );
  let regenerated = 0;
  const tree = AttachmentSummaryDialog({
    fileName: "report.pdf",
    content: '**Saved summary**\n\n<img src="https://example.invalid/image">',
    busy: false,
    onClose() {},
    onRegenerate: () => regenerated++,
  });
  const descendants = (node) =>
    React.Children.toArray(node).flatMap((child) =>
      React.isValidElement(child)
        ? [child, ...descendants(child.props.children)]
        : [],
    );
  const button = descendants(tree).find((node) =>
    React.Children.toArray(node.props.children).includes("Generate again"),
  );
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  assert.equal(regenerated, 1);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /report.pdf/);
  assert.match(html, /Saved summary/);
  assert.doesNotMatch(html, /<img/);
});
