const { test } = require("node:test");
const assert = require("node:assert/strict");
const data = require("../evaluation/workspace.json");
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "test/no-env",
  NODE_ENV: "test",
  AI_ENABLED: "false",
  VISUAL_ENABLED: "false",
  MEETING_SUMMARY_ENABLED: "false",
  CONVERSATION_AI_ENABLED: "false",
  WORK_ASSISTANT_SERVICE_KEY: "fixture-work-assistant-not-production-00000",
  WORK_ASSISTANT_PROJECT_URL: "http://project.fixture.invalid",
  WORK_ASSISTANT_CALENDAR_URL: "http://calendar.fixture.invalid",
  DATABASE_URL: "postgres://fixture:fixture@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "fixture",
  LLM_MODEL: "fixture",
});
const { WorkContextService } = require("../dist/modules/work-assistant/work-context");

for (const scenario of data.scenarios)
  test(`workspace/${scenario.id}: authorized, exact and source-aware context`, async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date(data.now).getTime() });
    const project = structuredClone(data.project);
    const calendar = structuredClone(data.calendar);
    const calls = [];
    if (scenario.variation === "partial-busy") calendar.busyPartial = true;
    if (scenario.variation === "partial-project") project.partial = true;
    if (scenario.variation === "invalid-metrics") project.metrics.onTimeRate = 1.5;
    t.mock.method(global, "fetch", async (url, options) => {
      const parsed = new URL(url);
      assert.ok(["project.fixture.invalid", "calendar.fixture.invalid"].includes(parsed.hostname));
      const payload = JSON.parse(options.body);
      assert.equal(payload.userId, data.actor.id);
      assert.equal(options.redirect, "error");
      calls.push({ path: parsed.pathname, payload });
      if (parsed.pathname.endsWith("/authorize"))
        return Response.json({ data: { projectIds: scenario.variation === "revoked" ? [] : [data.projectId] } });
      const isProject = parsed.hostname === "project.fixture.invalid";
      const offline = scenario.variation === "both-offline" || scenario.variation === (isProject ? "project-offline" : "calendar-offline");
      return offline ? new Response(null, { status: 503 }) : Response.json({ data: isProject ? project : calendar });
    });
    const scope = scenario.scope === "project" ? { projectId: data.projectId, audience: "project" } : { audience: "mine" };
    const read = () => new WorkContextService().read(data.actor, scope, 7, undefined, data.timeZone);
    if (scenario.errorStatus) {
      await assert.rejects(read(), (error) => error.getStatus() === scenario.errorStatus);
      assert.ok(calls.every((call) => call.path.endsWith("/authorize")));
      return;
    }
    const result = await read();
    assert.equal(result.sources.project.state, scenario.projectState);
    assert.equal(result.sources.calendar.state, scenario.calendarState);
    assert.equal(result.metrics.project?.completedInPeriod ?? null, scenario.projectState === "unavailable" ? null : data.expected.projectCompleted);
    const calendarMissing = scenario.calendarState === "unavailable";
    assert.equal(result.metrics.focusSeconds, calendarMissing ? null : data.expected.focusSeconds);
    assert.equal(result.metrics.personal?.completedInPeriod ?? null, calendarMissing || scenario.scope === "project" ? null : data.expected.personalCompleted);
    if (calendarMissing || scenario.variation === "partial-busy") {
      assert.deepEqual(result.freeSlots, []);
      assert.equal(result.busyPartial, true);
    } else {
      assert.deepEqual(result.freeSlots.filter((slot) => slot.startAt < "2026-10-29T17:00:00.000Z"), data.expected.todayFreeSlots);
      assert.ok(!result.freeSlots.some((slot) => slot.startAt >= "2026-10-29T17:00:00.000Z" && slot.startAt < "2026-10-30T17:00:00.000Z"));
    }
    if (scenario.id === "work-personal") {
      assert.deepEqual(result.tasks.map((task) => task.id), data.expected.rankedTaskIds);
      assert.equal(result.metrics.project.onTimeRate, data.expected.onTimeRate);
    }
    if (scenario.scope === "project") assert.ok(result.tasks.every((task) => task.kind === "project"));
    assert.equal(result.detailPartial, scenario.variation === "partial-project");
    assert.ok(!JSON.stringify(result.busy).includes("title"));
  });
