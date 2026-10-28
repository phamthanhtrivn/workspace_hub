const fs = require("node:fs/promises"),
  http = require("node:http"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../.."),
  requireAi = createRequire(path.join(root, "backend/ai-service/package.json"));
const dotenv = requireAi("dotenv");
(async () => {
  const env = dotenv.parse(
    await fs.readFile(path.join(root, "backend/ai-service/.env"), "utf8"),
  );
  Object.assign(process.env, env, {
    DOTENV_CONFIG_PATH: "test/no-env",
    MEETING_SUMMARY_ENABLED: "false",
    DATABASE_URL: "postgres://fixture:fixture@localhost/fixture",
    NODE_ENV: "test",
  });
  const { transcribeMeeting } = requireAi(
    "./dist/modules/meeting-summary/pipeline",
  );
  const { config } = requireAi("./dist/config/env.config");
  const database = requireAi("./dist/infrastructure/database/database");
  const directory = path.resolve(root, "../.tmp/meeting-local-speech"),
    video = await fs.readFile(path.join(directory, "sample.mp4"));
  const server = http.createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "video/mp4",
      "content-length": video.length,
    });
    response.end(video);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(),
    host = "127.0.0.1:" + address.port;
  config.MEETING_MEDIA_HOSTS = host;
  const manifest = {
    recordingId: "11111111-1111-4111-8111-111111111111",
    revision: "f".repeat(64),
    url: "http://" + host + "/fixture.mp4",
    sizeBytes: video.length,
    durationSeconds: 12,
  };
  const state = {
    actor_id: "22222222-2222-4222-8222-222222222222",
    revision: manifest.revision,
    transcript: [],
    transcript_complete: false,
    partials: [],
  };
  const stages = [],
    timings = {};
  try {
    await transcribeMeeting(manifest, {
      state,
      signal: AbortSignal.timeout(180000),
      authorize: async () => manifest,
      checkpoint: async (stage) => stages.push(stage),
      measure: async (stage, run) => {
        const start = performance.now();
        try {
          return await run();
        } finally {
          timings[stage] = Math.round(performance.now() - start);
        }
      },
    });
    assert.equal(state.transcript_complete, true);
    assert.ok(state.transcript.length > 0);
    const text = state.transcript.map((s) => s.text).join(" ");
    assert.match(
      text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
      /ly le/,
    );
    const result = {
      passed: true,
      runAt: new Date().toISOString(),
      mode: "real-ffmpeg-and-local-whisper; public-audio; no-cloud-STT-or-summary-call",
      sampleSource:
        "https://huggingface.co/datasets/dinhlam2210/voice-Viet-Nam/blob/main/data/audio_014.wav",
      transcript: text,
      stages,
      timings,
      transcriptComplete: state.transcript_complete,
    };
    const report = path.join(
      root,
      "docs/testing/meeting-local-speech-results.json",
    );
    await fs.writeFile(report, JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await database.db.end();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
