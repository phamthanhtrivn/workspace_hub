import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import ts from "typescript";

// Exercise the real TypeScript helpers with Node's runner, without adding a
// frontend test framework or changing production module resolution.
const modules = new Map();
function loadTypeScript(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (specifier) => {
    const relative = path.resolve(path.dirname(filename), `${specifier}.ts`);
    return specifier.startsWith(".") && existsSync(relative) ? loadTypeScript(relative) : originalRequire(specifier);
  };
  modules.set(filename, loaded);
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}

const directory = path.dirname(fileURLToPath(import.meta.url));
const storage = loadTypeScript(path.resolve(directory, "../utils/pomodoro-local-storage.ts"));
const { createAmbientPreferencesSync } = loadTypeScript(path.resolve(directory, "../utils/ambient-preferences-sync.ts"));
const { AMBIENT_VOLUME_SAVE_DELAY_MS } = loadTypeScript(path.resolve(directory, "../types/pomodoro-preferences.ts"));
const first = { trackId: "rain_heavy", volume: 0.25, autoPlayOnFocus: false };
const second = { trackId: "gentle_piano", volume: 0.75, autoPlayOnFocus: true };

function localStorageWindow() {
  const entries = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  } };
  return entries;
}

async function waitFor(predicate) {
  const deadline = Date.now() + 1500;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, "condition timed out");
    await delay(5);
  }
}

test("view and audio preferences are isolated per user and survive clearing timer data", () => {
  localStorageWindow();
  storage.saveLocalPomodoroViewMode("first-user", "focus");
  storage.saveLocalPomodoroViewMode("second-user", "full");
  storage.saveLocalAmbientPreferences("first-user", first);
  storage.saveLocalAmbientPreferences("second-user", second);
  storage.clearLocalPomodoroData("first-user");
  assert.equal(storage.loadLocalPomodoroViewMode("first-user"), "focus");
  assert.equal(storage.loadLocalPomodoroViewMode("second-user"), "full");
  assert.equal(storage.loadLocalPomodoroViewMode("unknown-user"), null);
  assert.deepEqual(storage.loadLocalAmbientPreferences("first-user"), first);
  assert.deepEqual(storage.loadLocalAmbientPreferences("second-user"), second);
});

test("corrupt, obsolete and invalid local preferences fall back safely", () => {
  const entries = localStorageWindow();
  const key = "workspace-hub:pomodoro:ambient-preferences:first-user";
  for (const raw of ["broken JSON", JSON.stringify({ schemaVersion: 99, value: first }),
    ...[{ trackId: "https://example.com/music" }, { volume: -1 }, { volume: 2 },
      { autoPlayOnFocus: "true" }].map((patch) => JSON.stringify({ schemaVersion: 1, value: { ...first, ...patch } }))]) {
    entries.set(key, raw);
    assert.equal(storage.loadLocalAmbientPreferences("first-user"), null);
  }
  entries.set("workspace-hub:pomodoro:view-mode:first-user", JSON.stringify({ schemaVersion: 1, value: "unknown" }));
  assert.equal(storage.loadLocalPomodoroViewMode("first-user"), null);
  globalThis.window.localStorage.getItem = () => { throw new Error("blocked storage"); };
  globalThis.window.localStorage.setItem = () => { throw new Error("blocked storage"); };
  assert.equal(storage.loadLocalPomodoroViewMode("first-user"), null);
  assert.doesNotThrow(() => storage.saveLocalAmbientPreferences("first-user", first, true));
});

test("an older save response never clears newer pending preferences", () => {
  localStorageWindow();
  storage.saveLocalAmbientPreferences("first-user", first, true);
  storage.saveLocalAmbientPreferences("first-user", second, true);
  storage.saveLocalAmbientPreferences("first-user", first);
  assert.deepEqual(storage.loadPendingAmbientPreferences("first-user"), second);
  assert.deepEqual(storage.loadLocalAmbientPreferences("first-user"), second);
  storage.saveLocalAmbientPreferences("first-user", second);
  assert.equal(storage.loadPendingAmbientPreferences("first-user"), null);
});

test("writes are serialized and intermediate queued changes are replaced", async () => {
  const writes = [];
  const saved = [];
  const completions = [];
  const sync = createAmbientPreferencesSync((preferences) => {
    writes.push(preferences);
    return new Promise((resolve) => completions.push(() => resolve(preferences)));
  }, (preferences) => saved.push(preferences));
  sync.start();
  sync.schedule(first);
  await waitFor(() => writes.length === 1);
  sync.schedule({ ...first, volume: 0.5 });
  sync.schedule(second);
  await delay(15);
  assert.equal(writes.length, 1);
  completions[0]();
  await waitFor(() => writes.length === 2);
  assert.deepEqual(writes, [first, second]);
  completions[1]();
  await waitFor(() => sync.getStatus() === "idle");
  assert.deepEqual(saved, [first, second]);
  assert.equal(sync.getRevision(), 3);
  sync.stop();
});

test("volume changes wait 300 ms and save only the latest snapshot", async () => {
  const writes = [];
  const sync = createAmbientPreferencesSync(async (preferences) => { writes.push(preferences); return preferences; }, () => {});
  sync.start();
  sync.schedule(first, AMBIENT_VOLUME_SAVE_DELAY_MS);
  await delay(100);
  sync.schedule(second, AMBIENT_VOLUME_SAVE_DELAY_MS);
  await delay(200);
  assert.equal(writes.length, 0);
  await waitFor(() => writes.length === 1);
  assert.deepEqual(writes, [second]);
  sync.stop();
});

test("failed saves retain the newest queued preference for reconnect retry", async () => {
  let fail;
  const writes = [];
  const sync = createAmbientPreferencesSync((preferences) => {
    writes.push(preferences);
    return writes.length === 1 ? new Promise((_, reject) => { fail = reject; }) : Promise.resolve(preferences);
  }, () => {});
  sync.start();
  sync.schedule(first);
  await waitFor(() => writes.length === 1);
  sync.schedule(second);
  fail(new Error("offline"));
  await waitFor(() => sync.getStatus() === "error");
  sync.retry();
  await waitFor(() => sync.getStatus() === "idle");
  assert.deepEqual(writes, [first, second]);
  sync.stop();
});

test("unmount stops queued saves and ignores late responses", async () => {
  let complete;
  const writes = [];
  const saved = [];
  const sync = createAmbientPreferencesSync((preferences) => {
    writes.push(preferences);
    return new Promise((resolve) => { complete = () => resolve(preferences); });
  }, (preferences) => saved.push(preferences));
  sync.start();
  sync.schedule(first);
  await waitFor(() => writes.length === 1);
  sync.schedule(second);
  sync.stop();
  complete();
  await delay(20);
  sync.retry();
  assert.deepEqual(writes, [first]);
  assert.deepEqual(saved, []);
});
