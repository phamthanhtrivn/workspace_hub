const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { createSourceLoader } = require('../../../../../../tests/support/typescript.cjs');
const load = createSourceLoader(path.resolve(__dirname, '../../..'));

// Exercise the source pipeline with local provider doubles, without loading private env or queues.
function fixture() {
  const directories = [],
    speechCalls = [],
    modelCalls = [],
    stages = [];
  let failSpeech = true,
    revoked = false;
  const stubs = {
    "../../infrastructure/integrations/audio-chunks": {
      AUDIO_CHUNK_SECONDS: 45,
      prepareAudioChunks: async (_source, directory) => {
        directories.push(directory);
        return [0, 1, 2].map((index) =>
          path.join(directory, `part-${index}.wav`),
        );
      },
    },
    "../../infrastructure/integrations/speech.client": {
      recognizeSpeechChunk: async (filename) => {
        const index = Number(path.basename(filename).match(/part-(\d+)/)[1]);
        speechCalls.push(index);
        if (failSpeech && index === 1)
          throw new Error("STT temporarily unavailable");
        return `Synthetic transcript ${index}`;
      },
    },
    "./summary": {
      transcriptBatches: (chunks) =>
        chunks.length ? chunks.map((chunk) => chunk.text) : [],
      meetingSummaryCacheKey: (text) => "hash:" + text,
      meetingSummaryText: async (text, final) => {
        modelCalls.push({ text, final });
        return final ? "Synthetic meeting summary" : `Note ${text}`;
      },
    },
  };
  const pipeline = load('src/modules/meeting-summary/pipeline.ts', stubs);
  const context = {
    state: {
      actor_id: "synthetic-owner",
      revision: "synthetic-revision",
      transcript: [],
      transcript_complete: false,
      partials: [],
    },
    signal: new AbortController().signal,
    authorize: async () => {
      if (revoked) throw new Error("Access revoked");
      return {};
    },
    checkpoint: async (stage) => {
      stages.push(stage);
    },
    measure: async (_stage, run) => run(),
  };
  return {
    pipeline,
    context,
    directories,
    speechCalls,
    modelCalls,
    stages,
    recoverSpeech() {
      failSpeech = false;
    },
    revoke() {
      revoked = true;
    },
  };
}

test("STT retry preserves successful chunks and removes temporary media directories", async () => {
  const f = fixture();
  await assert.rejects(
    f.pipeline.transcribeMeeting({}, f.context),
    /STT temporarily/,
  );
  assert.deepEqual(
    f.context.state.transcript.map((chunk) => chunk.startSeconds),
    [0],
  );
  f.recoverSpeech();
  await f.pipeline.transcribeMeeting({}, f.context);
  assert.deepEqual(f.speechCalls, [0, 1, 1, 2]);
  assert.equal(f.context.state.transcript_complete, true);
  await f.pipeline.transcribeMeeting({}, f.context);
  assert.deepEqual(f.speechCalls, [0, 1, 1, 2]);
  for (const directory of f.directories)
    await assert.rejects(fsp.access(directory), { code: "ENOENT" });
});

test("summary reduction reuses saved notes and returns a final result using a mock model", async () => {
  const f = fixture();
  f.context.state.transcript = [
    { startSeconds: 0, text: "A" },
    { startSeconds: 45, text: "B" },
  ];
  f.context.state.partials = [{ hash: "hash:A", text: "Saved A" }];
  assert.equal(
    await f.pipeline.summarizeMeeting(f.context),
    "Synthetic meeting summary",
  );
  assert.deepEqual(
    f.modelCalls.map((call) => call.final),
    [false, true],
  );
  assert.equal(f.modelCalls[0].text, "B");
  assert.match(f.modelCalls[1].text, /Saved A/);
});

test("revoked access and empty speech never invoke the summarization provider", async () => {
  const f = fixture();
  await assert.rejects(
    f.pipeline.summarizeMeeting(f.context),
    /No speech recognized/,
  );
  f.context.state.transcript = [{ startSeconds: 0, text: "Synthetic speech" }];
  f.revoke();
  await assert.rejects(
    f.pipeline.summarizeMeeting(f.context),
    /Access revoked/,
  );
  assert.equal(f.modelCalls.length, 0);
});
