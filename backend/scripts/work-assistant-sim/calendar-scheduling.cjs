const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../..");
const { chromium } = require(
  process.env.WORK_ASSISTANT_PLAYWRIGHT_MODULE ||
    path.resolve(
      root,
      "../.tmp/dashboard-verification/node_modules/playwright",
    ),
);
const config = JSON.parse(
  fs.readFileSync(
    path.resolve(root, "../.tmp/work-assistant-simulation/access.private.json"),
    "utf8",
  ),
);
const output = path.join(root, "docs/testing/work-assistant-simulation");
(async () => {
  const user = config.users[1],
    login = await fetch(config.api + "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
  const token = (await login.json()).data.accessToken;
  const response = (route) =>
    fetch(config.api + "/api/ai/work-assistant" + route, {
      headers: { authorization: "Bearer " + token },
    });
  const data = async (route) => {
    const r = await response(route);
    assert.ok(r.ok);
    return (await r.json()).data;
  };
  const control = async (value) => {
    const r = await fetch(config.api + "/__test/control", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-key": config.testKey,
      },
      body: JSON.stringify(value),
    });
    assert.ok(r.ok);
  };
  const checks = [],
    errors = [],
    before = await data("/overview");
  assert.equal(before.schedulingBasis, "calendar");
  assert.equal("preferences" in before, false);
  assert.ok(before.freeSlots.length > 0);
  assert.equal((await response("/preferences")).status, 404);
  checks.push(
    "Calendar availability works without manual settings; old preferences API is absent",
  );
  try {
    const blocked = {
      startAt: config.workingDay + "T00:00:00+07:00",
      endAt: new Date(
        Date.parse(config.workingDay + "T00:00:00+07:00") + 86400000,
      ).toISOString(),
    };
    await control({ busyOverride: [...before.busy, blocked] });
    const changed = await data("/overview");
    assert.ok(
      changed.freeSlots.every(
        (s) =>
          Date.parse(s.endAt) <= Date.parse(blocked.startAt) ||
          Date.parse(s.startAt) >= Date.parse(blocked.endAt),
      ),
    );
    checks.push(
      "Calendar changes and all-day events immediately change suggested gaps",
    );
    await control({ calendarPartial: true });
    const partial = await data("/overview");
    assert.equal(partial.busyPartial, true);
    assert.deepEqual(partial.freeSlots, []);
    await control({ calendarPartial: false, calendarOffline: true });
    const offline = await data("/overview");
    assert.equal(offline.sources.calendar.state, "unavailable");
    assert.deepEqual(offline.freeSlots, []);
    checks.push(
      "Incomplete or unavailable Calendar yields no unsupported free-time claims",
    );
  } finally {
    await control({
      busyOverride: null,
      calendarPartial: false,
      calendarOffline: false,
    });
  }
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.route("https://accounts.google.com/**", (r) =>
      r.fulfill({ status: 200, body: "" }),
    );
    await context.routeWebSocket(
      /\/(communication|notification|project)\.io\//,
      (s) => s.close(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (e) => errors.push(e.message));
    let settingsCalls = 0;
    page.on("request", (r) => {
      if (r.url().includes("/work-assistant/preferences")) settingsCalls++;
    });
    await page.goto(config.url + "/login");
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.locator("button[type=submit]").click();
    await page
      .getByRole("button", { name: "Mở trợ lý công việc", exact: true })
      .click();
    const panel = page.locator("#work-assistant-panel");
    assert.equal(
      await panel
        .getByRole("button", { name: "Thiết lập giờ làm việc", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await panel
        .getByText("Thiết lập giờ làm để gợi ý lịch", { exact: true })
        .count(),
      0,
    );
    await panel
      .getByText("Gợi ý thời gian dựa trên lịch Calendar của bạn.", {
        exact: true,
      })
      .waitFor();
    checks.push(
      "Settings icon/form/setup CTA are absent and Calendar guidance is visible",
    );
    await panel
      .getByRole("button", { name: "Tạo cuộc trò chuyện mới", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector("#work-question")?.disabled,
    );
    const question =
      "Nhìn Calendar ngày " +
      config.workingDay +
      ", hãy chọn đúng 1 phiên 25 phút trong khoảng 09:00–17:00 để xử lý T2, không trùng lịch bận. Viết dòng đầu dạng HH:mm–HH:mm, sau đó giải thích ngắn vì sao.";
    await panel.locator("#work-question").fill(question);
    const stream = page.waitForResponse(
      (r) =>
        r.url().includes("/work-assistant/sessions/") &&
        r.request().method() === "POST" &&
        r.url().endsWith("/messages"),
    );
    await panel
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    console.log(
      "Checking a real-model answer against Calendar busy intervals...",
    );
    const answerResponse = await stream;
    assert.ok(answerResponse.ok());
    const wire = await answerResponse.text();
    const done = wire.split("\n\n").find((s) => s.startsWith("event: done"));
    assert.ok(done, "AI did not finish successfully: " + wire.slice(-400));
    const answer = JSON.parse(done.split("\ndata: ")[1]).message.content;
    const time =
      /(\d{1,2}):(\d{2})\s*(?:–|—|-|đến|tới)\s*(\d{1,2}):(\d{2})/.exec(
        answer.replace(/\*/g, ""),
      );
    assert.ok(
      time,
      "The answer should contain the requested concrete time range",
    );
    const start = +time[1] * 60 + +time[2],
      end = +time[3] * 60 + +time[4];
    assert.equal(end - start, 25);
    assert.ok(start >= 540 && end <= 1020);
    const startAt = Date.parse(
        config.workingDay +
          "T" +
          String(time[1]).padStart(2, "0") +
          ":" +
          time[2] +
          ":00+07:00",
      ),
      endAt = Date.parse(
        config.workingDay +
          "T" +
          String(time[3]).padStart(2, "0") +
          ":" +
          time[4] +
          ":00+07:00",
      );
    assert.ok(
      before.busy.every(
        (b) => endAt <= Date.parse(b.startAt) || startAt >= Date.parse(b.endAt),
      ),
    );
    assert.ok(!answer.includes("Thiết lập giờ làm"));
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#work-assistant-panel [role=log] article")
          .length === 2,
    );
    await page.screenshot({
      path: path.join(output, "calendar-scheduling-desktop.png"),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document
          .getElementById("work-assistant-panel")
          ?.getAttribute("aria-modal") === "true",
    );
    assert.equal(
      await panel
        .getByRole("button", { name: "Thiết lập giờ làm việc", exact: true })
        .count(),
      0,
    );
    await page.screenshot({
      path: path.join(output, "calendar-scheduling-mobile.png"),
    });
    assert.equal(settingsCalls, 0);
    assert.deepEqual(errors, []);
    checks.push(
      "Live model suggests a 25-minute daytime slot without Calendar conflicts or manual setup",
    );
    const result = {
      passed: true,
      runAt: new Date().toISOString(),
      mode: "real-ui-and-model; isolated-sql; source-auth-fixtures",
      checks,
      question,
      answer,
      settingsApiCalls: settingsCalls,
      pageErrors: errors,
    };
    fs.writeFileSync(
      path.join(output, "calendar-scheduling-check.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
