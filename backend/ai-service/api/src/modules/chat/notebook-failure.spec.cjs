const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const { notebookFailureMessage } = load(
  "src/modules/chat/notebook-failure.ts",
  {
    "../../infrastructure/integrations/provider-http": {
      isProviderConnectTimeout: () => false,
    },
  },
);

test("English AI errors retain their specific recovery guidance", () => {
  const cases = [
    [
      "The response reached the 2048-token output limit and is incomplete.",
      /output limit/,
    ],
    [
      "The AI response is missing valid source citations. Please try again.",
      /valid source citations/,
    ],
    ["The AI did not determine the question scope.", /invalid response format/],
    ["The source has changed.", /Source access or version changed/],
    [
      "The AI connection ended before completion.",
      /interrupted before completion/,
    ],
    ["The response is too long.", /size limit/],
  ];
  for (const [message, expected] of cases)
    assert.match(notebookFailureMessage(new Error(message)), expected);
});

test("quota feedback is English and keeps the retry metadata and error codes", () => {
  const { ModelDailyQuotaException, ModelMinuteQuotaException } = load(
    "src/common/errors/model-quota.exception.ts",
  );
  const minute = new ModelMinuteQuotaException(2500).getResponse();
  assert.equal(minute.code, "MODEL_MINUTE_QUOTA");
  assert.equal(minute.retryAfterMs, 2500);
  assert.match(minute.message, /per-minute request limit/);
  const daily = new ModelDailyQuotaException(60000, true).getResponse();
  assert.equal(daily.code, "VISION_DAILY_QUOTA");
  assert.match(daily.message, /00:00 UTC/);
});
