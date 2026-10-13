import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import {
  ParticipantKind,
  RemoteTrackPublication,
  Track,
  TrackEvent,
} from "livekit-client";

function loadUtility(name) {
  const source = readFileSync(
    fileURLToPath(
      new URL(`../features/meeting/utils/${name}.ts`, import.meta.url),
    ),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: compiled.exports,
    module: compiled,
    Date,
    Number,
    Math,
    require(name) {
      if (name === "livekit-client") return { ParticipantKind };
      if (name === "./meeting-captions") return loadUtility("meeting-captions");
      throw new Error("Unexpected utility dependency: " + name);
    },
  });
  return compiled.exports;
}
const { selectRecordingStage } = loadUtility("recording-stage");
const { recordingElapsedSeconds } = loadUtility("recording-duration");
const { recordingPollInterval, recordingRequestRefreshAt } =
  loadUtility("recording-polling");
const { syncRecordingSubscriptions } = loadUtility("recording-subscriptions");
const { isRecordingParticipant } = loadUtility("recording-participants");
const camera = (id) => ({ participant: { identity: id } });
const cameras = [camera("host"), camera("speaker"), camera("third")];
const share = camera("presenter");

test("speaker layout focuses the current speaker and retains other cameras", () => {
  const stage = selectRecordingStage("speaker", cameras, [], "speaker");
  assert.equal(stage.main, cameras[1]);
  assert.deepEqual(Array.from(stage.tiles), [cameras[0], cameras[2]]);
});
test("speaker recording stays on cameras when somebody shares their desktop", () => {
  const stage = selectRecordingStage("speaker", cameras, [share], "speaker");
  assert.equal(stage.main, cameras[1]);
  assert.deepEqual(Array.from(stage.tiles), [cameras[0], cameras[2]]);
  assert.equal(stage.screen, false);
  assert.equal(selectRecordingStage("speaker", [], [share]).main, undefined);
});
test("gallery recording keeps the same cameras before, during and after sharing", () => {
  const sharing = selectRecordingStage("grid", cameras, [share]);
  assert.equal(sharing.main, undefined);
  assert.deepEqual(Array.from(sharing.tiles), cameras);
  assert.equal(sharing.screen, false);
  const gallery = selectRecordingStage("grid", cameras, []);
  assert.equal(gallery.main, undefined);
  assert.equal(gallery.tiles.length, 3);
});
test("screen-only keeps cameras out of the output and waits when nobody shares", () => {
  assert.equal(
    selectRecordingStage("screen", cameras, [share]).tiles.length,
    0,
  );
  const idle = selectRecordingStage("screen", cameras, []);
  assert.equal(idle.main, undefined);
  assert.equal(idle.tiles.length, 0);
});
test("sharing does not shrink the gallery or introduce a screen tile", () => {
  const many = Array.from({ length: 12 }, (_, index) => camera(String(index)));
  const stage = selectRecordingStage("grid", many, [share], "11");
  assert.equal(stage.main, undefined);
  assert.deepEqual(Array.from(stage.tiles), many);
});
test("gallery has a bounded 25-tile output and an empty room remains valid", () => {
  assert.equal(
    selectRecordingStage(
      "grid",
      Array.from({ length: 40 }, (_, i) => camera(String(i))),
      [],
    ).tiles.length,
    25,
  );
  assert.equal(selectRecordingStage("speaker", [], []).main, undefined);
});
const first = "2026-10-09T10:00:00Z";
const resumed = "2026-10-09T10:10:00Z";
const now = new Date("2026-10-09T10:10:20Z").getTime();
test("the resumed timer excludes time paused between segments", () => {
  assert.equal(
    recordingElapsedSeconds(
      {
        status: "RECORDING",
        recordedSeconds: 30,
        startedAt: first,
        segmentStartedAt: resumed,
      },
      now,
    ),
    50,
  );
});
test("paused, pausing and starting timers freeze at the confirmed duration", () => {
  for (const status of ["PAUSED", "PAUSING", "STARTING", "PROCESSING"]) {
    assert.equal(
      recordingElapsedSeconds(
        {
          status,
          recordedSeconds: 30,
          startedAt: first,
          segmentStartedAt: resumed,
        },
        now,
      ),
      30,
    );
  }
});
test("legacy and camera-free recordings still show elapsed time safely", () => {
  assert.equal(
    recordingElapsedSeconds(
      {
        status: "RECORDING",
        recordedSeconds: 0,
        startedAt: first,
        segmentStartedAt: null,
      },
      now,
    ),
    620,
  );
  assert.equal(
    recordingElapsedSeconds(
      {
        status: "RECORDING",
        recordedSeconds: 0,
        startedAt: "invalid",
        segmentStartedAt: null,
      },
      now,
    ),
    0,
  );
});

test("healthy sockets use slow recovery polling, disconnected requests use fast polling", () => {
  for (const status of [
    "STARTING",
    "RECORDING",
    "PAUSING",
    "PROCESSING",
    "PAUSED",
  ])
    assert.equal(
      recordingPollInterval({ recording: { status } }, true),
      30_000,
    );
  assert.equal(
    recordingPollInterval({ recordingRequest: { status: "PENDING" } }, true),
    30_000,
  );
  assert.equal(
    recordingPollInterval({ recordingRequest: { status: "PENDING" } }, false),
    3000,
  );
  assert.equal(recordingPollInterval({ recordingRequests: [{}] }, false), 3000);
  assert.equal(
    recordingPollInterval({ recording: { status: "PROCESSING" } }, false),
    3000,
  );
  assert.equal(recordingPollInterval(undefined, false), 5000);
});
test("request refresh schedules the closest pending expiry and cooldown without extra polling", () => {
  const time = Date.parse(first);
  const request = {
    status: "PENDING",
    expiresAt: new Date(time + 120_000).toISOString(),
    requestedAt: first,
  };
  assert.equal(
    recordingRequestRefreshAt({ recordingRequest: request }, time),
    time + 120_000,
  );
  assert.equal(
    recordingRequestRefreshAt(
      {
        recordingRequests: [
          request,
          { ...request, expiresAt: new Date(time + 30_000).toISOString() },
        ],
      },
      time,
    ),
    time + 30_000,
  );
  assert.equal(
    recordingRequestRefreshAt(
      {
        needsRecordingPermission: true,
        canRequestRecording: false,
        recordingRequest: { ...request, status: "REJECTED" },
      },
      time,
    ),
    time + 60_000,
  );
  assert.equal(
    recordingRequestRefreshAt(
      {
        needsRecordingPermission: false,
        recordingRequest: { ...request, status: "REJECTED" },
      },
      time,
    ),
    undefined,
  );
  assert.equal(
    recordingRequestRefreshAt({ recordingRequest: request }, time + 120_000),
    undefined,
  );
  assert.equal(
    recordingRequestRefreshAt(
      { recordingRequest: { ...request, expiresAt: "invalid" } },
      time,
    ),
    undefined,
  );
});
test("real LiveKit publications receive only visible video subscriptions and all microphones", () => {
  const publications = Array.from(
    { length: 60 },
    (_, i) =>
      new RemoteTrackPublication(
        Track.Kind.Video,
        {
          sid: `camera-${i}`,
          name: `Camera ${i}`,
          type: 1,
          source: 1,
          muted: false,
        },
        false,
      ),
  );
  const screen = new RemoteTrackPublication(
    Track.Kind.Video,
    { sid: "screen", name: "Screen", type: 1, source: 3, muted: false },
    false,
  );
  const audio = Array.from(
    { length: 60 },
    (_, i) =>
      new RemoteTrackPublication(
        Track.Kind.Audio,
        {
          sid: `audio-${i}`,
          name: `Mic ${i}`,
          type: 0,
          source: 2,
          muted: false,
        },
        false,
      ),
  );
  const all = [...publications, screen, ...audio];
  let updates = 0;
  all.forEach((publication) =>
    publication.on(TrackEvent.UpdateSubscription, () => updates++),
  );
  const gallery = new Set(publications.slice(0, 25).map((p) => p.trackSid));
  syncRecordingSubscriptions(all, gallery);
  assert.equal(updates, 85);
  syncRecordingSubscriptions(all, gallery);
  assert.equal(
    updates,
    85,
    "unchanged stage sends no extra subscription messages",
  );
  syncRecordingSubscriptions(all, new Set(["screen"]));
  assert.equal(publications.filter((p) => p.isDesired).length, 0);
  assert.equal(screen.isDesired, true);
  assert.ok(audio.every((p) => p.isDesired));
  syncRecordingSubscriptions(all, new Set(["screen", "camera-59"]));
  assert.equal(publications.filter((p) => p.isDesired).length, 1);
  syncRecordingSubscriptions(all, new Set(["screen", "camera-58"]));
  assert.equal(publications[59].isDesired, false);
  assert.equal(publications[58].isDesired, true);
  syncRecordingSubscriptions(all, gallery);
  assert.equal(screen.isDesired, false);
  assert.equal(publications.filter((p) => p.isDesired).length, 25);
  syncRecordingSubscriptions(all, new Set());
  assert.ok(publications.every((p) => !p.isDesired));
  assert.ok(audio.every((p) => p.isDesired));
});

test("camera layouts never subscribe to shared video or desktop audio", () => {
  const microphone = new RemoteTrackPublication(
    Track.Kind.Audio,
    { sid: "mic", name: "Mic", type: 0, source: 2, muted: false },
    false,
  );
  const desktopAudio = new RemoteTrackPublication(
    Track.Kind.Audio,
    {
      sid: "desktop-audio",
      name: "Desktop audio",
      type: 0,
      source: 4,
      muted: false,
    },
    false,
  );
  const desktop = new RemoteTrackPublication(
    Track.Kind.Video,
    { sid: "desktop", name: "Desktop", type: 1, source: 3, muted: false },
    false,
  );
  const all = [microphone, desktopAudio, desktop];
  // Start with an explicitly selected screen recording, then switch back.
  syncRecordingSubscriptions(all, new Set(["desktop"]), true);
  assert.ok(all.every((publication) => publication.isDesired));
  for (const layout of ["speaker", "grid"]) {
    const stage = selectRecordingStage(layout, cameras, [share], "speaker");
    const visible = new Set(
      [stage.main, ...stage.tiles]
        .filter(Boolean)
        .map((track) => track.participant.identity),
    );
    syncRecordingSubscriptions(all, visible);
    assert.equal(microphone.isDesired, true);
    assert.equal(desktop.isDesired, false);
    assert.equal(desktopAudio.isDesired, false);
  }
});

test("excluded participants lose microphone subscriptions even in screen-only mode", () => {
  const microphone = new RemoteTrackPublication(
    Track.Kind.Audio,
    {
      sid: "excluded-mic",
      name: "Hidden microphone",
      type: 0,
      source: 2,
      muted: false,
    },
    true,
  );
  syncRecordingSubscriptions(
    [microphone],
    new Set(),
    true,
    new Set([microphone.trackSid]),
  );
  assert.equal(microphone.isDesired, false);
});

test("only visible attendees are eligible for recording", () => {
  const participant = { identity: "attendee", kind: ParticipantKind.STANDARD };
  assert.equal(isRecordingParticipant(participant), true);
  for (const excluded of [
    { ...participant, isLocal: true },
    { ...participant, permissions: { hidden: true } },
    { ...participant, kind: ParticipantKind.EGRESS },
    { ...participant, identity: "captions:worker" },
  ])
    assert.equal(isRecordingParticipant(excluded), false);
});
