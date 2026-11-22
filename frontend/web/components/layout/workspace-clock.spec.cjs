/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  createSourceLoader,
} = require("../../../../tests/support/typescript.cjs");

function renderClock(instant, timeZone = "Asia/Ho_Chi_Minh") {
  const load = createSourceLoader(path.resolve(__dirname, "../.."));
  const { WorkspaceClock } = load("components/layout/workspace-clock.tsx", {
    "@/hooks/use-current-time": {
      useCurrentTime: () => (instant ? new Date(instant) : null),
    },
    "@/features/user-setting/hooks/use-account-timezone": {
      useAccountTimezone: () => timeZone,
    },
    "@/components/ui/button": { Button: "button" },
  });

  return renderToStaticMarkup(
    React.createElement(WorkspaceClock, { onOpenSettings() {} }),
  );
}

test("header clock distinguishes morning, noon and midnight in the account timezone", () => {
  const cases = [
    ["2026-11-22T02:15:00Z", "09:15 AM", "22/11/2026"],
    ["2026-11-22T05:40:00Z", "12:40 PM", "22/11/2026"],
    ["2026-11-22T17:00:00Z", "12:00 AM", "23/11/2026"],
  ];
  for (const [instant, time, date] of cases) {
    const markup = renderClock(instant);
    assert.ok(markup.includes(`aria-label="${date}, ${time}, UTC+07:00.`));
    assert.ok(markup.includes(`dateTime="${new Date(instant).toISOString()}"`));
    assert.match(markup, new RegExp(`>${time.slice(-2)}</span>`));
  }
});

test("changing the account timezone updates the displayed date and AM/PM together", () => {
  const markup = renderClock("2026-11-22T02:15:00Z", "America/New_York");
  assert.ok(markup.includes('aria-label="21/11/2026, 09:15 PM, UTC-05:00.'));
});

test("server clock placeholder does not claim an AM/PM period before the clock loads", () => {
  const markup = renderClock(null);
  assert.ok(markup.includes("--:--"));
  assert.doesNotMatch(markup, />AM<|>PM<|Invalid Date/);
});
