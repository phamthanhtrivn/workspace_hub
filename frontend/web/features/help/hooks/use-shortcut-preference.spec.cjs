/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");

test("shortcut preference persists, synchronizes and remains usable when storage is blocked", (context) => {
  const previous = {
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  const storage = new Map(),
    events = new Map();
  let blocked = false,
    changed = 0,
    snapshot,
    unsubscribe;
  globalThis.localStorage = {
    getItem: (key) => {
      if (blocked) throw new Error("Blocked");

      return storage.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (blocked) throw new Error("Blocked");
      storage.set(key, value);
    },
  };
  globalThis.window = {
    addEventListener: (key, fn) => events.set(key, fn),
    removeEventListener: (key) => events.delete(key),
  };
  context.after(() => {
    unsubscribe?.();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const load = createSourceLoader(path.resolve(__dirname, "../../.."));
  const { SHORTCUT_PREFERENCE_KEY } = load(
    "features/help/constants/help-shortcuts.ts",
  );
  const { useShortcutPreference } = load(
    "features/help/hooks/use-shortcut-preference.ts",
    {
      react: {
        useSyncExternalStore: (subscribe, read, readServer) => {
          snapshot = read;
          assert.equal(readServer(), true);
          unsubscribe = subscribe(() => changed++);

          return read();
        },
      },
    },
  );
  const [enabled, setEnabled] = useShortcutPreference();
  assert.equal(enabled, true);
  setEnabled(false);
  assert.equal(snapshot(), false);
  assert.equal(storage.get(SHORTCUT_PREFERENCE_KEY), "false");
  assert.equal(changed, 1);
  storage.set(SHORTCUT_PREFERENCE_KEY, "true");
  events.get("storage")({ key: SHORTCUT_PREFERENCE_KEY });
  assert.equal(snapshot(), true);
  assert.equal(changed, 2);
  blocked = true;
  setEnabled(false);
  assert.equal(snapshot(), false);
  setEnabled(true);
  assert.equal(snapshot(), true);
  unsubscribe();
  unsubscribe = undefined;
  assert.equal(events.size, 0);
});
