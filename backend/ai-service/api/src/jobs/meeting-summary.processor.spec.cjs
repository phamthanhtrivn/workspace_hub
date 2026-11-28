const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../.."));

test("an interrupted summary saves English feedback as a SQL parameter without replaying processing", async () => {
  const calls = [];
  const { processMeetingSummary } = load(
    "src/jobs/meeting-summary.processor.ts",
    {
      "../infrastructure/database/database": {
        rows: async (sql, parameters) => {
          calls.push({ sql, parameters });
          return [];
        },
      },
      "../common/single-flight": {
        singleFlight: () => assert.fail("must not restart interrupted work"),
      },
      "../modules/meeting-summary/source": {
        meetingSource: () => assert.fail("must not fetch media"),
      },
      "../modules/meeting-summary/pipeline": {
        transcribeMeeting: () => assert.fail("must not call speech"),
        summarizeMeeting: () => assert.fail("must not call the model"),
      },
      "../infrastructure/integrations/speech.client": {
        SpeechRecognitionError: class extends Error {},
      },
    },
  );
  await processMeetingSummary("recording", "run");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].parameters, ["recording", "run"]);
  assert.match(calls[1].sql, /error=\$3/);
  assert.deepEqual(calls[1].parameters, [
    "recording",
    "run",
    "Processing was interrupted. You can retry.",
  ]);
});
