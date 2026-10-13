import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { RoomEvent, Track } from "livekit-client";
import { isAxiosError } from "axios";

const source = readFileSync(
  new URL(
    "../features/meeting/hooks/useMeetingScreenShare.ts",
    import.meta.url,
  ),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture(options = {}) {
  const calls = [];
  const notices = [];
  const tracks = ["video", "audio"].map((kind) => ({
    kind,
    mediaStreamTrack: { readyState: "live" },
    stop() {
      this.mediaStreamTrack.readyState = "ended";
      calls.push("stop:" + kind);
    },
  }));
  const room = {
    localParticipant: {
      createScreenTracks: () => {
        calls.push("capture");
        return options.capture
          ? options.capture(tracks)
          : Promise.resolve(tracks);
      },
      publishTrack: async (track) => {
        calls.push("publish:" + track.kind);
        if (options.failAudio && track.kind === "audio")
          throw new Error("Publish failed");
      },
      unpublishTrack: async (track) => {
        calls.push("unpublish:" + track.kind);
      },
    },
  };
  const modules = {
    react: {
      useCallback: (fn) => fn,
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useRef: (value) => ({ current: value }),
      useState: (value) => [value, () => {}],
    },
    "@livekit/components-react": { useRoomContext: () => room },
    "livekit-client": { RoomEvent, Track },
    axios: { isAxiosError },
    sonner: {
      toast: {
        info: (message) => notices.push(message),
        error: (message) => notices.push(message),
      },
    },
    "@/store/store": {
      useAppSelector: (select) => select({ auth: { userId: "host" } }),
    },
    "../api/meeting.api": {
      startMeetingScreenShare: async () => {
        calls.push("reserve");
        if (options.rejectApi) throw new Error("API unavailable");
        if (options.accept) await options.accept;
        return {
          data: {
            screenShareEnabled: true,
            activeScreenShareUserId: "host",
            screenShareStartedAt: "now",
          },
        };
      },
      stopMeetingScreenShare: async () => {
        calls.push("release");
      },
    },
    "../types/meeting.types": {
      MEETING_ROLE: {
        HOST: "HOST",
        COHOST: "COHOST",
        PARTICIPANT: "PARTICIPANT",
      },
    },
    "../utils/meeting-room.utils": { parseParticipantMetadata: () => ({}) },
    "./useMeetingConfirmDialog": {
      useMeetingConfirmDialog: () => ({ confirm: async () => true }),
    },
    "./useMeetingSocket": { useMeetingSocket: () => {} },
  };
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiled,
    exports: compiled.exports,
    require(name) {
      assert.ok(name in modules, "Unexpected dependency " + name);
      return modules[name];
    },
    Error,
    DOMException,
    console: { error() {} },
  });
  const hook = compiled.exports.useMeetingScreenShare({
    meetingId: "meeting",
    joinToken: "join",
    participantRole: "HOST",
    initialScreenShareEnabled: true,
    initialActiveScreenShareUserId: options.activeUser ?? null,
    initialScreenShareStartedAt: null,
    activeScreenShareTrack: null,
  });
  return { hook, calls, tracks, notices };
}

test("opens capture on the click and waits for backend permission before publishing", async () => {
  const capture = deferred();
  const permission = deferred();
  const f = fixture({
    capture: () => capture.promise,
    accept: permission.promise,
  });
  f.hook.toggleScreenShare();
  assert.deepEqual(f.calls, ["capture"]);
  capture.resolve(f.tracks);
  await flush();
  assert.deepEqual(f.calls, ["capture", "reserve"]);
  permission.resolve();
  await flush();
  assert.deepEqual(f.calls, [
    "capture",
    "reserve",
    "publish:video",
    "publish:audio",
  ]);
});

test("cancelling capture cannot reserve or interrupt somebody else's screen share", async () => {
  const f = fixture({
    activeUser: "member",
    capture: async () => {
      throw new DOMException("Cancelled", "NotAllowedError");
    },
  });
  f.hook.toggleScreenShare();
  await flush();
  assert.deepEqual(f.calls, ["capture"]);
  assert.match(f.notices[0], /cancelled or permission was denied/);
});

test("API rejection stops all captured tracks without publishing", async () => {
  const f = fixture({ rejectApi: true });
  f.hook.toggleScreenShare();
  await flush();
  assert.ok(
    f.tracks.every((track) => track.mediaStreamTrack.readyState === "ended"),
  );
  assert.ok(!f.calls.some((call) => call.startsWith("publish:")));
  assert.ok(!f.calls.includes("release"));
});

test("a partial publish failure removes tracks and releases backend ownership", async () => {
  const f = fixture({ failAudio: true });
  f.hook.toggleScreenShare();
  await flush();
  assert.ok(
    f.tracks.every((track) => track.mediaStreamTrack.readyState === "ended"),
  );
  assert.ok(f.calls.includes("unpublish:video"));
  assert.equal(f.calls.filter((call) => call === "release").length, 1);
});

test("OS capture failures give actionable feedback without claiming the screen share", async () => {
  const f = fixture({
    capture: async () => {
      throw new DOMException("OS blocked capture", "NotReadableError");
    },
  });
  f.hook.toggleScreenShare();
  await flush();
  assert.deepEqual(f.calls, ["capture"]);
  assert.match(f.notices[0], /system's screen recording permissions/);
});

test("unsupported capture reports the browser limitation without reserving the room", async () => {
  const f = fixture({
    capture: async () => {
      throw new DOMException("Not supported", "NotSupportedError");
    },
  });
  f.hook.toggleScreenShare();
  await flush();
  assert.deepEqual(f.calls, ["capture"]);
  assert.match(f.notices[0], /supported desktop browser/);
});

test("ending capture during API authorization releases ownership without publishing", async () => {
  const permission = deferred();
  const f = fixture({ accept: permission.promise });
  f.hook.toggleScreenShare();
  await flush();
  f.tracks.forEach((track) => track.stop());
  permission.resolve();
  await flush();
  assert.ok(!f.calls.some((call) => call.startsWith("publish:")));
  assert.equal(f.calls.filter((call) => call === "release").length, 1);
});
