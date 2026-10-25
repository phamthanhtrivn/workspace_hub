const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { PGlite } = require("@electric-sql/pglite");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  AI_ENABLED: "false",
  VISUAL_ENABLED: "false",
  MEETING_SUMMARY_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://vibi.top/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
  GOOGLE_CLOUD_PROJECT: "fixture-project",
  MEETING_MEDIA_HOSTS: "media.example",
});
const database = require("../dist/infrastructure/database/database");
const source = require("../dist/modules/meeting-summary/source");
const media = require("../dist/modules/meeting-summary/media");
const speech = require("../dist/modules/meeting-summary/speech.client");
const summary = require("../dist/modules/meeting-summary/summary");
const {
  processMeetingSummary,
} = require("../dist/jobs/meeting-summary.processor");
const { config } = require("../dist/config/env.config");
const id = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const revision = "a".repeat(64);
const manifest = {
  recordingId: id,
  revision,
  url: "https://media.example/test",
  sizeBytes: 12,
  durationSeconds: 90,
};
let sql;
before(async () => {
  sql = new PGlite();
  await sql.exec("CREATE SCHEMA notebook_ai");
  await sql.exec(
    await fs.readFile(
      path.join(__dirname, "../migrations/002_meeting_summaries.sql"),
      "utf8",
    ),
  );
});
beforeEach(async () => {
  await sql.exec("TRUNCATE notebook_ai.meeting_summaries");
  await sql.query(
    "INSERT INTO notebook_ai.meeting_summaries(recording_id,actor_id,run_id,revision,status) VALUES($1,$2,$3,$4,'QUEUED')",
    [id, actorId, runId, revision],
  );
});
after(async () => {
  await sql.close();
  await database.db.end();
});

function mocks(t) {
  t.mock.method(
    database,
    "rows",
    async (query, args) => (await sql.query(query, args)).rows,
  );
  const sourceMock = t.mock.method(
    source,
    "meetingSource",
    async (_id, user) => {
      assert.equal(user, actorId);
      return manifest;
    },
  );
  const mediaMock = t.mock.method(media, "prepareMeetingAudio", async () => [
    "chunk0",
    "chunk1",
  ]);
  const speechMock = t.mock.method(
    speech,
    "recognizeMeetingChunk",
    async (name) => `Nội dung ${name}: họp lúc 9 giờ.`,
  );
  const summaryMock = t.mock.method(
    summary,
    "meetingSummaryText",
    async (text) => {
      assert.match(text, /Nội dung/);
      return "Cuộc họp lúc 9 giờ.";
    },
  );
  return { sourceMock, mediaMock, speechMock, summaryMock };
}
async function state() {
  return (await sql.query("SELECT * FROM notebook_ai.meeting_summaries"))
    .rows[0];
}

test("hierarchical summary retry reuses transcript and completed model notes", async (t) => {
  const fixture = mocks(t);
  let recognized = 0,
    notes = 0,
    finals = 0;
  fixture.speechMock.mock.mockImplementation(async () => {
    recognized++;
    return "Nội dung ".repeat(1100);
  });
  fixture.summaryMock.mock.mockImplementation(async (_text, final) => {
    if (!final) {
      notes++;
      return "Nội dung đã rút gọn.";
    }
    if (++finals === 1) throw Error("unknown final outcome");
    return "Final meeting summary";
  });
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "FAILED");
  assert.equal((await state()).partials.length, 2);
  await sql.exec("UPDATE notebook_ai.meeting_summaries SET status='QUEUED'");
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "COMPLETED");
  assert.equal(recognized, 2);
  assert.equal(notes, 2);
  assert.equal(finals, 2);
});

test("revocation during final generation prevents publishing the answer", async (t) => {
  const fixture = mocks(t);
  let revoked = false;
  fixture.sourceMock.mock.mockImplementation(async () => {
    if (revoked) throw Error("revoked");
    return manifest;
  });
  fixture.summaryMock.mock.mockImplementation(async () => {
    revoked = true;
    return "private summary";
  });
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "FAILED");
  assert.equal((await state()).content, null);
});

test("full worker pipeline persists transcript and summary; duplicate delivery cannot call providers again", async (t) => {
  const { speechMock } = mocks(t);
  let calls = 0;
  speechMock.mock.mockImplementation(async () => {
    calls++;
    return "Nội dung cuộc họp.";
  });
  await processMeetingSummary(id, runId);
  let result = await state();
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.transcript.length, 2);
  assert.deepEqual(
    result.transcript.map((chunk) => chunk.startSeconds),
    [0, 45],
  );
  assert.equal(result.content, "Cuộc họp lúc 9 giờ.");
  await processMeetingSummary(id, runId);
  assert.equal(calls, 2);
  assert.equal((await state()).status, "COMPLETED");
});

test("failed transcription checkpoints completed chunks; an explicit retry reuses them", async (t) => {
  const { speechMock: recognize } = mocks(t);
  let calls = 0;
  recognize.mock.mockImplementation(async () => {
    if (++calls === 2) throw Error("private provider diagnostics");
    return "Nội dung đã nhận dạng.";
  });
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "FAILED");
  assert.equal((await state()).transcript.length, 1);
  assert.ok(!(await state()).error.includes("private"));
  await sql.query("UPDATE notebook_ai.meeting_summaries SET status='QUEUED'");
  recognize.mock.mockImplementation(async (name) => {
    assert.equal(name, "chunk1");
    calls++;
    return "Nội dung tiếp theo.";
  });
  await processMeetingSummary(id, runId);
  assert.equal(calls, 3);
  assert.equal((await state()).status, "COMPLETED");
});

test("revoked recording access prevents all downloads and paid calls", async (t) => {
  const mocksForRun = mocks(t);
  mocksForRun.sourceMock.mock.mockImplementation(async () => {
    throw Error("revoked");
  });
  mocksForRun.mediaMock.mock.mockImplementation(async () =>
    assert.fail("must not download"),
  );
  mocksForRun.speechMock.mock.mockImplementation(async () =>
    assert.fail("must not transcribe"),
  );
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "FAILED");
});

test("changed revisions fail closed and interrupted running jobs do not replay providers", async (t) => {
  const mocksForRun = mocks(t);
  mocksForRun.sourceMock.mock.mockImplementation(async () => ({
    ...manifest,
    revision: "b".repeat(64),
  }));
  mocksForRun.mediaMock.mock.mockImplementation(async () =>
    assert.fail("must not download"),
  );
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "FAILED");
  await sql.query("UPDATE notebook_ai.meeting_summaries SET status='RUNNING'");
  await processMeetingSummary(id, runId);
  assert.equal((await state()).status, "FAILED");
});

test("media URLs require an exact allowed host and reject embedded credentials and redirects", async (t) => {
  for (const url of [
    "https://media.example.evil.test/file",
    "file:///etc/passwd",
    "https://user:pass@media.example/file",
    "https://127.0.0.1/file",
  ])
    assert.throws(() => media.assertMediaUrl(url));
  media.assertMediaUrl("https://media.example/file");
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "meeting-media-test-"),
  );
  t.after(() => {
    assert.equal(path.dirname(directory), os.tmpdir());
    return fs.rm(directory, { recursive: true, force: true });
  });
  const fetchMock = t.mock.method(global, "fetch", async (_url, options) => {
    assert.equal(options.redirect, "error");
    return new Response("bad", { status: 302 });
  });
  await assert.rejects(
    media.prepareMeetingAudio(
      manifest,
      directory,
      new AbortController().signal,
    ),
    /download failed/,
  );
});

test("source bridge unwraps Communication response and rejects oversized recordings", async (t) => {
  const fetchMock = t.mock.method(global, "fetch", async (_url, options) => {
    assert.equal(JSON.parse(options.body).actorId, actorId);
    return Response.json({ data: manifest });
  });
  assert.equal(
    (await source.meetingSource(id, actorId, new AbortController().signal))
      .revision,
    revision,
  );
  fetchMock.mock.mockImplementation(async () =>
    Response.json({
      data: { ...manifest, sizeBytes: config.MEETING_SUMMARY_MAX_BYTES + 1 },
    }),
  );
  await assert.rejects(
    source.meetingSource(id, actorId, new AbortController().signal),
    /limits/,
  );
});

test("bounded transcript batching preserves all content and approximate timestamps", () => {
  const chunks = [
    { startSeconds: 0, text: "a".repeat(17000) },
    { startSeconds: 45, text: "last fact" },
  ];
  const batches = summary.transcriptBatches(chunks);
  assert.ok(batches.length > 1);
  assert.ok(batches.every((text) => text.length <= 16000));
  assert.equal(
    batches
      .join("")
      .replace(/\[\d+:\d+\] /g, "")
      .replace(/\n/g, ""),
    chunks.map((chunk) => chunk.text).join(""),
  );
  assert.match(batches.join(""), /\[0:45\] last fact/);
});

test("Google speech uses V2 chirp_3 Vietnamese and no diarization or automatic retries", async (t) => {
  const { GoogleAuth } = require("google-auth-library");
  t.mock.method(
    GoogleAuth.prototype,
    "getAccessToken",
    async () => "fixture-token",
  );
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "meeting-speech-test-"),
  );
  const audio = path.join(directory, "test.wav");
  await fs.writeFile(audio, Buffer.from("RIFFfixture"));
  t.after(() => {
    assert.equal(path.dirname(directory), os.tmpdir());
    return fs.rm(directory, { recursive: true, force: true });
  });
  let requests = 0;
  const fetch = t.mock.method(global, "fetch", async (url, options) => {
    requests++;
    assert.match(
      url,
      /us-speech.googleapis.com\/v2\/projects\/fixture-project/,
    );
    const body = JSON.parse(options.body);
    assert.deepEqual(body.config, {
      autoDecodingConfig: {},
      languageCodes: ["vi-VN"],
      model: "chirp_3",
    });
    return Response.json({
      results: [{ alternatives: [{ transcript: "Xin chào." }] }],
    });
  });
  assert.equal(
    await speech.recognizeMeetingChunk(audio, new AbortController().signal),
    "Xin chào.",
  );
  fetch.mock.mockImplementation(async () => {
    requests++;
    return new Response(null, { status: 429 });
  });
  await assert.rejects(
    speech.recognizeMeetingChunk(audio, new AbortController().signal),
    /429/,
  );
  assert.equal(requests, 2);
});
