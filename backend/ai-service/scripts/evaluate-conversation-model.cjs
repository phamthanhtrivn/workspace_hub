// Opt-in benchmark. Uses synthetic inputs and the existing application's quota gate.
const fs = require("node:fs");
const path = require("node:path");
const { setTimeout: pause } = require("node:timers/promises");
const { cases } = require("./conversation-model-cases.cjs");
function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw Error(`${name} requires a value`);
  return value;
}
const caseId = option("--case");
const limitText = option("--limit");
const limit = limitText === undefined ? cases.length : Number(limitText);
if (!Number.isSafeInteger(limit) || limit < 1) throw Error("--limit must be a positive integer");
const selected = cases.filter((fixture) => !caseId || fixture.id === caseId).slice(0, limit);
if (!selected.length) throw Error(`Unknown evaluation case: ${caseId}`);
if (process.argv.includes("--list")) {
  console.log(JSON.stringify(selected.map(({ id, category }) => ({ id, category: category ?? "legacy" })), null, 2));
  process.exit(0);
}
if (!process.argv.includes("--run")) {
  console.log(
    `${selected.length} synthetic cases selected. Use --list, --case ID or --limit N to inspect selection. Set the model through the process environment; use --run and optionally --out FILE. No .env is changed.`,
  );
  process.exit(0);
}
const outputIndex = process.argv.indexOf("--out");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
if (outputIndex >= 0 && (!output || output.startsWith("--")))
  throw Error("--out requires a file path");
if (output) {
  fs.accessSync(path.dirname(path.resolve(output)), fs.constants.W_OK);
  if (fs.existsSync(output)) fs.accessSync(output, fs.constants.W_OK);
}
const root = process.env.AI_EVAL_APP_ROOT || path.resolve(__dirname, "..");
const { config } = require(path.join(root, "dist/config/env.config"));
if (new URL(config.LLM_BASE_URL).origin !== "https://vibi.top")
  throw Error("Evaluation is scoped to the approved provider");
const provider = new URL(config.LLM_BASE_URL).origin;
let active;
const fetchOriginal = global.fetch;
global.fetch = async (url, options) => {
  const response = await fetchOriginal(url, options);
  if (
    active &&
    new URL(typeof url === "string" ? url : url.url || url.toString())
      .origin === provider
  ) {
    active.requests++;
    active.statuses.push(response.status);
    try {
      const payload = await response.clone().json();
      if (payload.usage) active.usage.push(payload.usage);
      if (payload.model) active.responseModels.push(payload.model);
    } catch {
      /* A non-JSON provider error is recorded by status. */
    }
  }
  return response;
};
const { conversationAnswer } = require(
  path.join(root, "dist/modules/conversation-ai/conversation-agent"),
);
const { db } = require(
  path.join(root, "dist/infrastructure/database/database"),
);
const results = [];
const report = () => ({
  evaluatedAt: new Date().toISOString(),
  model: config.CONVERSATION_AI_MODEL ?? config.LLM_MODEL,
  maxTokens: config.CONVERSATION_AI_MAX_TOKENS ?? config.LLM_MAX_TOKENS,
  providerOrigin: provider,
  datasetVersion: 1,
  selectedCases: selected.map((fixture) => fixture.id),
  complete: results.length === selected.length,
  cases: results,
  note: "Small synthetic checks, not a general intelligence benchmark. Authentication and real conversation data are not used.",
});
(async () => {
  for (let index = 0; index < selected.length; index++) {
    if (index) await pause(35000);
    const fixture = selected[index];
    let reads = 0;
    const result = {
      id: fixture.id,
      category: fixture.category ?? "legacy",
      requests: 0,
      statuses: [],
      usage: [],
      responseModels: [],
    };
    active = result;
    const start = performance.now();
    try {
      result.answer = await conversationAnswer(
        fixture.question,
        async () => {
          reads++;
          return fixture.history;
        },
        AbortSignal.timeout(180000),
      );
      result.checks = fixture.grade(result.answer, reads);
      result.passed = Object.values(result.checks).every(Boolean);
    } catch (error) {
      result.passed = false;
      result.error = {
        name: error.name,
        status: error.status,
        message: String(error.message)
          .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
          .slice(0, 240),
      };
    }
    result.latencyMs = Math.round(performance.now() - start);
    result.historyReads = reads;
    active = undefined;
    results.push(result);
    if (output) fs.writeFileSync(output, JSON.stringify(report(), null, 2));
    console.log(
      JSON.stringify({
        model: config.CONVERSATION_AI_MODEL ?? config.LLM_MODEL,
        case: result.id,
        passed: result.passed,
        checks: result.checks,
        latencyMs: result.latencyMs,
        requests: result.requests,
        error: result.error,
      }),
    );
    if (
      result.error &&
      result.statuses.some((status) => [400, 401, 403, 404].includes(status))
    )
      break;
  }
  console.log(
    JSON.stringify({
      model: config.CONVERSATION_AI_MODEL ?? config.LLM_MODEL,
      cases: results.length,
      passed: results.filter((result) => result.passed).length,
      output,
    }),
  );
  if (results.some((result) => !result.passed)) process.exitCode = 1;
})()
  .catch((error) => {
    console.error(
      JSON.stringify({ evaluationFailed: true, error: error.name }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    global.fetch = fetchOriginal;
    await db.end();
  });
