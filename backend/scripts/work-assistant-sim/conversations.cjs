const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
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
async function login(user) {
  const response = await fetch(config.api + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  assert.ok(response.ok);
  return (await response.json()).data.accessToken;
}
(async () => {
  const user = config.users[1],
    token = await login(user),
    otherToken = await login(config.users[2]);
  const request = (route, auth = token) =>
    fetch(config.api + "/api/ai/work-assistant" + route, {
      headers: { authorization: "Bearer " + auth },
    });
  const data = async (route) => {
    const response = await request(route);
    assert.ok(response.ok);
    return (await response.json()).data;
  };
  let original = await data("/session");
  if (!original.messages.length) {
    for (const candidate of (await data("/sessions")).sessions) {
      const conversation = await data("/session?sessionId=" + candidate.id);
      if (conversation.messages.length) {
        original = conversation;
        break;
      }
    }
  }
  assert.ok(
    original.messages.length > 0,
    "Run the seeded user simulation first to prepare existing conversations.",
  );
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const checks = [],
    errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.route("https://accounts.google.com/**", (r) =>
      r.fulfill({ status: 200, body: "" }),
    );
    await context.routeWebSocket(
      /\/(communication|notification|project)\.io\//,
      (socket) => socket.close(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(config.url + "/login");
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.locator('button[type="submit"]').click();
    await page
      .getByRole("button", { name: "Mở trợ lý công việc", exact: true })
      .click();
    const panel = page.locator("#work-assistant-panel");
    const originalTitle = (await data("/sessions")).sessions.find(
      (item) => item.id === original.id,
    ).title;
    await panel
      .getByRole("button", { name: "Danh sách cuộc trò chuyện", exact: true })
      .click();
    await panel
      .locator("#work-conversation-list")
      .getByRole("button")
      .filter({ has: page.getByText(originalTitle, { exact: true }) })
      .first()
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#work-assistant-panel [role=log] article")
          .length > 0,
    );
    assert.equal(
      await panel
        .getByRole("button", { name: "Xóa lịch sử hội thoại", exact: true })
        .count(),
      0,
    );
    assert.equal(await panel.getByRole("button", { name: "Thiết lập giờ làm việc", exact: true }).count(), 0);
    checks.push("Trash and manual working-hour actions are absent");
    const createdResponse = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith("/work-assistant/sessions") &&
        r.request().method() === "POST",
    );
    await panel
      .getByRole("button", { name: "Tạo cuộc trò chuyện mới", exact: true })
      .click();
    const created = (await (await createdResponse).json()).data;
    assert.notEqual(created.id, original.id);
    await page.waitForFunction(() => {
      const panel = document.getElementById("work-assistant-panel");
      return (
        panel &&
        panel.querySelectorAll("[role=log] article").length === 0 &&
        !panel.querySelector("#work-question")?.disabled
      );
    });
    assert.equal(
      (await data("/session?sessionId=" + created.id)).messages.length,
      0,
    );
    assert.deepEqual(
      (await data("/session?sessionId=" + original.id)).messages.map(
        (m) => m.id,
      ),
      original.messages.map((m) => m.id),
    );
    checks.push(
      "Creating a conversation starts empty and keeps existing messages",
    );
    await panel
      .getByRole("button", { name: "Danh sách cuộc trò chuyện", exact: true })
      .click();
    const list = panel.locator("#work-conversation-list");
    await list
      .getByRole("heading", { name: "Cuộc trò chuyện trong phạm vi này" })
      .waitFor();
    const items = (await data("/sessions")).sessions;
    const old = items.find((item) => item.id === original.id);
    assert.ok(old);
    const oldButton = list
      .getByRole("button")
      .filter({ has: page.getByText(old.title, { exact: true }) });
    await oldButton.first().click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#work-assistant-panel [role=log] article")
          .length > 0,
    );
    const refresh = page.waitForResponse(
      (r) =>
        r.url().includes("/work-assistant/session?") &&
        r.url().includes("sessionId=" + original.id),
    );
    await panel
      .getByRole("button", {
        name: "Làm mới dữ liệu và hội thoại",
        exact: true,
      })
      .click();
    assert.ok((await refresh).ok());
    checks.push(
      "History list reopens the selected conversation and refresh keeps its identity",
    );
    const forbidden = await request(
      "/session?sessionId=" + original.id,
      otherToken,
    );
    assert.equal(forbidden.status, 404);
    assert.equal(
      (
        await fetch(
          config.api +
            "/api/ai/work-assistant/sessions/" +
            original.id +
            "/messages",
          { method: "DELETE", headers: { authorization: "Bearer " + token } },
        )
      ).status,
      404,
    );
    checks.push(
      "Other accounts cannot open the thread; delete endpoint is unavailable",
    );
    await panel
      .getByRole("button", { name: "Danh sách cuộc trò chuyện", exact: true })
      .click();
    const listBounds = await list.boundingBox(),
      panelBounds = await panel.boundingBox();
    assert.ok(
      listBounds.y >= panelBounds.y &&
        listBounds.y < panelBounds.y + panelBounds.height,
    );
    await page.screenshot({
      path: path.join(output, "conversations-desktop.png"),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document
          .getElementById("work-assistant-panel")
          ?.getAttribute("aria-modal") === "true",
    );
    const mobileBounds = await panel.boundingBox();
    assert.ok(mobileBounds.x >= 0 && mobileBounds.width <= 390);
    const historyButton = panel.getByRole("button", {
      name: "Danh sách cuộc trò chuyện",
      exact: true,
    });
    const historyBounds = await historyButton.boundingBox();
    assert.ok(
      historyBounds.x >= 0 && historyBounds.x + historyBounds.width <= 390,
    );
    await page.screenshot({
      path: path.join(output, "conversations-mobile.png"),
    });
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    checks.push(
      "Desktop and mobile history are reachable; Escape closes the mobile panel",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(config.url + "/projects/" + config.ids.p1);
    await page
      .getByRole("button", { name: "Mở trợ lý công việc", exact: true })
      .click();
    const scopedResponse = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith("/work-assistant/sessions") &&
        r.request().method() === "POST",
    );
    await panel
      .getByRole("button", { name: "Tạo cuộc trò chuyện mới", exact: true })
      .click();
    const scoped = (await (await scopedResponse).json()).data;
    assert.equal(scoped.projectId, config.ids.p1);
    await panel
      .getByRole("button", { name: "Danh sách cuộc trò chuyện", exact: true })
      .click();
    await list.getByRole("button").first().waitFor();
    const scopedList = await data("/sessions?projectId=" + config.ids.p1);
    assert.ok(
      scopedList.sessions.every((item) => item.projectId === config.ids.p1),
    );
    checks.push(
      "Project conversations are created and listed in their own scope",
    );
    assert.deepEqual(errors, []);
    const result = {
      passed: true,
      runAt: new Date().toISOString(),
      mode: "real-ui-and-assistant-api; isolated-sql; source-auth-fixtures; no-model-call",
      checks,
      pageErrors: errors,
    };
    fs.writeFileSync(
      path.join(output, "conversation-check.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
