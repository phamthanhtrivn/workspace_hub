import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { RemoteTrackPublication, Track, TrackEvent } from "livekit-client";

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
  });
  return compiled.exports;
}
const { selectRecordingStage } = loadUtility("recording-stage");
const { recordingElapsedSeconds } = loadUtility("recording-duration");
const { recordingPollInterval, recordingRequestRefreshAt } =
  loadUtility("recording-polling");
const { syncRecordingSubscriptions } = loadUtility("recording-subscriptions");
const camera = (id) => ({ participant: { identity: id } });
const cameras = [camera("host"), camera("speaker"), camera("third")];
const share = camera("presenter");

test("speaker layout focuses the current speaker and retains other cameras", () => {
  const stage = selectRecordingStage("speaker", cameras, [], "speaker");
  assert.equal(stage.main, cameras[1]);
  assert.deepEqual(Array.from(stage.tiles), [cameras[0], cameras[2]]);
});
test("a screen share takes the main stage while the active speaker stays visible", () => {
  const stage = selectRecordingStage("speaker", cameras, [share], "speaker");
  assert.equal(stage.main, share);
  assert.equal(stage.tiles[0], cameras[1]);
  assert.equal(stage.screen, true);
});
test("gallery switches to shared screen plus cameras and returns after sharing ends", () => {
  const sharing = selectRecordingStage("grid", cameras, [share]);
  assert.equal(sharing.main, share);
  assert.equal(sharing.tiles.length, 3);
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
test("shared-screen gallery keeps the active speaker in its bounded camera column", () => {
  const many = Array.from({ length: 12 }, (_, index) => camera(String(index)));
  const stage = selectRecordingStage("grid", many, [share], "11");
  assert.equal(stage.tiles.length, 5);
  assert.equal(stage.tiles[0], many[11]);
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
test("real LiveKit publications receive only visible video subscriptions and all audio", () => {
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
