/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

function fixture(context, enabled = true) {
  const previous = {
    HTMLElement: globalThis.HTMLElement,
    document: globalThis.document,
  };
  class Element {
    constructor(editable = false) {
      this.editable = editable;
    }
    closest() {
      return this.editable ? this : null;
    }
  }
  globalThis.HTMLElement = Element;
  let overlay = false;
  globalThis.document = { querySelector: () => (overlay ? {} : null) };
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const { createWorkspaceShortcutHandler, shouldIgnoreShortcut } = load(
    "features/help/utils/keyboard-shortcuts.ts",
  );
  const destinations = [];
  let opened = 0;
  const handler = createWorkspaceShortcutHandler({
    enabled,
    openHelp: () => opened++,
    navigate: (href) => destinations.push(href),
  });
  const event = (key, overrides = {}) => ({
    key,
    target: new Element(),
    defaultPrevented: false,
    repeat: false,
    isComposing: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides,
  });

  return {
    handler,
    destinations,
    opened: () => opened,
    event,
    Element,
    shouldIgnoreShortcut,
    setOverlay: (value) => {
      overlay = value;
    },
  };
}

test("Help remains reachable when app shortcuts are disabled; navigation does not run", (context) => {
  const f = fixture(context, false);
  f.handler.handle(f.event("g"));
  f.handler.handle(f.event("c"));
  assert.deepEqual(f.destinations, []);
  const help = f.event("?", { shiftKey: true });
  f.handler.handle(help);
  assert.equal(f.opened(), 1);
  assert.equal(help.defaultPrevented, true);
});

test("navigation requires a prefix and consumes Calendar's destination key", (context) => {
  const f = fixture(context);
  const standalone = f.event("c");
  f.handler.handle(standalone);
  assert.equal(standalone.defaultPrevented, false);
  assert.deepEqual(f.destinations, []);
  for (const [key, href] of [
    ["d", "/dashboard"],
    ["p", "/projects"],
    ["c", "/calendar"],
    ["f", "/pomodoro"],
    ["m", "/chat"],
    ["v", "/meetings"],
    ["o", "/documents"],
    ["n", "/ai"],
  ]) {
    f.handler.handle(f.event("g"));
    const destination = f.event(key);
    f.handler.handle(destination);
    assert.equal(destination.defaultPrevented, true);
    assert.equal(f.destinations.at(-1), href);
  }
});

test("typing, composition, handled keys, repeats, modifiers and overlays cancel pending navigation", (context) => {
  const f = fixture(context);
  for (const overrides of [
    { target: new f.Element(true) },
    { isComposing: true },
    { keyCode: 229 },
    { repeat: true },
    { defaultPrevented: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
  ]) {
    f.handler.handle(f.event("g"));
    f.handler.handle(f.event("c", overrides));
    f.handler.handle(f.event("c"));
    assert.deepEqual(f.destinations, []);
  }
  f.handler.handle(f.event("g"));
  f.setOverlay(true);
  f.handler.handle(f.event("?"));
  f.setOverlay(false);
  f.handler.handle(f.event("c"));
  assert.equal(f.opened(), 0);
  assert.deepEqual(f.destinations, []);
});

test("expired, unrelated and explicitly reset prefixes cannot navigate", (context) => {
  const f = fixture(context);
  const originalNow = Date.now;
  let now = 0;
  Date.now = () => now;
  context.after(() => {
    Date.now = originalNow;
  });
  f.handler.handle(f.event("g"));
  now = 1001;
  f.handler.handle(f.event("c"));
  f.handler.handle(f.event("g"));
  f.handler.handle(f.event("x"));
  f.handler.handle(f.event("c"));
  f.handler.handle(f.event("g"));
  f.handler.reset();
  f.handler.handle(f.event("c"));
  assert.deepEqual(f.destinations, []);
});

test("Calendar honors the preference and lets global navigation take priority", (context) => {
  const f = fixture(context);
  const previousWindow = globalThis.window;
  const disposers = [];
  let keydown,
    created = 0,
    today = 0;
  const views = [];
  globalThis.window = {
    addEventListener: (_, handler) => {
      keydown = handler;
    },
    removeEventListener() {},
  };
  context.after(() => {
    disposers.forEach((dispose) => dispose?.());
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  const React = require("react");
  let enabled = true;
  const { useCalendarKeyboardShortcuts } = load(
    "features/calendar/hooks/use-calendar-keyboard-shortcuts.ts",
    {
      react: { ...React, useEffect: (effect) => disposers.push(effect()) },
      "@/features/help/hooks/use-workspace-help": {
        useWorkspaceHelp: () => ({ shortcutsEnabled: enabled }),
      },
    },
  );
  const callbacks = {
    onCreate: () => created++,
    onToday: () => today++,
    onViewChange: (view) => views.push(view),
  };
  useCalendarKeyboardShortcuts(callbacks);
  f.handler.handle(f.event("g"));
  const destination = f.event("c");
  f.handler.handle(destination);
  keydown(destination);
  assert.equal(created, 0);
  keydown(f.event("c"));
  keydown(f.event("t"));
  keydown(f.event("w"));
  assert.equal(created, 1);
  assert.equal(today, 1);
  assert.deepEqual(views, ["timeGridWeek"]);
  enabled = false;
  useCalendarKeyboardShortcuts(callbacks);
  keydown(f.event("c"));
  keydown(f.event("t"));
  keydown(f.event("m"));
  assert.equal(created, 1);
  assert.equal(today, 1);
  assert.deepEqual(views, ["timeGridWeek"]);
});
