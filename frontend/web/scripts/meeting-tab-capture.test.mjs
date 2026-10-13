import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../features/meeting/hooks/useMeetingTabCapture.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
function fixture(options = {}) {
  const calls = [];
  const origin = "http://localhost:3000";
  const listeners = {};
  const media = {
    getSettings: () => ({ displaySurface: options.surface ?? "browser" }),
    getCaptureHandle: () => ({ origin, handle: options.otherTab ? "different-tab" : "this-tab" }),
    addEventListener: (event, listener) => { listeners[event] = listener; },
    stop: () => { calls.push("stop"); listeners.ended?.(); },
  };
  const room = { localParticipant: {
    publishTrack: async (_track, settings) => { calls.push(["publish", settings]); return { trackSid: "TR_capture" }; },
    unpublishTrack: async () => { calls.push("unpublish"); },
  } };
  const modules = {
    react: { useCallback: (fn) => fn, useRef: (value) => ({ current: value }), useEffect: (fn) => { fn(); } },
    "@livekit/components-react": { useRoomContext: () => room },
    "livekit-client": { Track: { Source: { Unknown: "unknown" } }, LocalVideoTrack: class { constructor(track) { this.mediaStreamTrack = track; } stop() { this.mediaStreamTrack.stop(); } } },
    "../api/meeting-recording.api": { recordingApi: { capturePermission: async (token, enabled) => { calls.push(["permission", token, enabled]); if (enabled && options.denied) throw new Error("Forbidden"); } } },
  };
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: compiled.exports, module: compiled,
    require: (name) => { assert.ok(modules[name], name); return modules[name]; },
    crypto: { randomUUID: () => "this-tab" }, window: { location: { origin } },
    navigator: { mediaDevices: {
      setCaptureHandleConfig: () => {},
      getDisplayMedia: async () => { calls.push("picker"); return { getVideoTracks: () => [media], getTracks: () => [media] }; },
    } }, Error, Set,
  });
  let ended = 0;
  const hook = compiled.exports.useMeetingTabCapture("meeting", () => { ended++; });
  return { hook, calls, listeners, ended: () => ended };
}

test("captures the meeting tab before granting narrowly scoped publish permission", async () => {
  const f = fixture();
  assert.equal(await f.hook.capture(), "TR_capture");
  assert.equal(f.calls[0], "picker");
  assert.deepEqual(f.calls[1], ["permission", "meeting", true]);
  assert.equal(f.calls[2][1].name, "meeting-tab-recording");
  assert.equal(f.calls[2][1].source, "unknown");
  await f.hook.release();
  assert.ok(f.calls.includes("stop"));
  assert.ok(f.calls.includes("unpublish"));
  assert.deepEqual(f.calls.at(-1), ["permission", "meeting", false]);
  assert.equal(f.ended(), 0, "intentional cleanup must not request another recording stop");
});
for (const options of [{ surface: "monitor" }, { surface: "window" }, { otherTab: true }]) {
  test("rejects capture outside this meeting tab: " + JSON.stringify(options), async () => {
    const f = fixture(options);
    await assert.rejects(f.hook.capture(), /Choose this Meeting tab/);
    assert.deepEqual(f.calls, ["picker", "stop"]);
  });
}
test("a permission rejection closes the capture and never publishes it", async () => {
  const f = fixture({ denied: true });
  await assert.rejects(f.hook.capture(), /Forbidden/);
  assert.ok(!f.calls.some((call) => Array.isArray(call) && call[0] === "publish"));
  assert.ok(f.calls.includes("stop"));
});
test("ending browser capture requests a recording stop", async () => {
  const f = fixture();
  await f.hook.capture();
  f.listeners.ended();
  assert.equal(f.ended(), 1);
});
