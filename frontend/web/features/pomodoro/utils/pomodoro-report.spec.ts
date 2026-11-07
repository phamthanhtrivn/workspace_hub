import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPomodoroReport, getPomodoroReportDays, presetReportRange, reportRangeErrors, type PomodoroReportRange } from "./pomodoro-report";
import { initialReportRange, reportRangeReducer } from "./pomodoro-report-range";
import { POMODORO_REPORT_DEFAULT_FILTERS } from "../constants/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { presentPomodoroSession } from "./pomodoro-session-presentation";
import { DATE_RANGE_MESSAGES } from "@/lib/date-range";

const now = new Date("2026-11-07T12:00:00Z");
const range: PomodoroReportRange = { startDate: "2026-11-01", endDate: "2026-11-07" };
const timeZone = "Asia/Ho_Chi_Minh";
const session = (id: string, overrides: Partial<PomodoroSessionRecord> = {}): PomodoroSessionRecord => ({
  id, sessionType: "FOCUS", status: "COMPLETED", startedAt: "2026-11-02T18:00:00Z",
  endedAt: "2026-11-02T18:25:00Z", durationMinutes: 25, actualSeconds: 1500, ...overrides,
});

test("summary and chart daily buckets include actual focus seconds from every status, excluding breaks", () => {
  const report = buildPomodoroReport([
    session("complete"), session("stopped", { status: "STOPPED", actualSeconds: 120 }),
    session("skipped", { status: "SKIPPED", actualSeconds: 30 }),
    session("break", { sessionType: "SHORT_BREAK", actualSeconds: 300 }),
  ], range, POMODORO_REPORT_DEFAULT_FILTERS, now, timeZone);
  assert.equal(report.summary.focusSeconds, 1650);
  assert.equal(report.summary.completedFocusSessions, 1);
  assert.equal(report.summary.stoppedFocusSessions, 1);
  assert.equal(report.summary.totalSessions, 4);
  assert.equal(report.daily.find(day => day.date === "2026-11-03")?.focusSeconds, 1650);
  assert.equal(report.daily.length, 7);
  assert.equal(report.daily.reduce((total, day) => total + day.focusSeconds, 0), report.summary.focusSeconds);
});

test("hiding empty table days does not alter the full chart range or drop break-only days", () => {
  const report = buildPomodoroReport([session("break", { sessionType: "LONG_BREAK" })], range, POMODORO_REPORT_DEFAULT_FILTERS, now, timeZone);
  assert.equal(getPomodoroReportDays(report.daily, true).length, 1);
  assert.equal(report.daily.length, 7);
  assert.equal(report.summary.focusSeconds, 0);
  assert.equal(report.summary.totalSessions, 1);
});

test("date-only reports include project and personal sessions in every view", () => {
  const report = buildPomodoroReport([
    session("project", { projectId: "p1", taskId: "t1" }),
    session("other-task", { projectId: "p1", taskId: "t2" }), session("personal"),
  ], range, POMODORO_REPORT_DEFAULT_FILTERS, now, timeZone);
  assert.equal(report.sessions.length, 3);
  assert.equal(report.summary.focusSeconds, 4500);
  assert.equal(report.daily.reduce((total, day) => total + day.totalSessions, 0), 3);
});

test("empty reports retain real zero values across the requested dates", () => {
  const report = buildPomodoroReport([], range, POMODORO_REPORT_DEFAULT_FILTERS, now, timeZone);
  assert.equal(report.summary.totalSessions, 0);
  assert.equal(report.summary.focusSeconds, 0);
  assert.equal(report.daily.length, 7);
  assert.deepEqual(report.sessions, []);
});

test("draft dates apply explicitly and cancel restores applied dates", () => {
  const initial = initialReportRange("2026-11-07");
  const draft = reportRangeReducer(initial, { type: "draft", range });
  assert.deepEqual(draft.applied, initial.applied);
  assert.deepEqual(reportRangeReducer(draft, { type: "cancel" }).draft, initial.applied);
  const applied = reportRangeReducer(draft, { type: "apply", today: "2026-11-07" });
  assert.equal(applied.preset, "month");
  assert.deepEqual(applied.applied, range);
});

test("each quick preset immediately updates both draft and applied dates", () => {
  const initial = initialReportRange("2026-11-07");
  for (const preset of ["today", "week", "month"] as const) {
    const state = reportRangeReducer(initial, { type: "preset", preset, today: "2026-11-07" });
    assert.equal(state.preset, preset);
    assert.deepEqual(state.applied, presetReportRange(preset, new Date("2026-11-07T00:00:00")));
    assert.deepEqual(state.draft, state.applied);
  }
});

test("manual dates select their matching quick preset only after Apply", () => {
  const initial = initialReportRange("2026-11-07");
  for (const preset of ["today", "week", "month"] as const) {
    const draftRange = presetReportRange(preset, new Date("2026-11-07T00:00:00"));
    const draft = reportRangeReducer(initial, { type: "draft", range: draftRange });
    assert.equal(draft.preset, initial.preset);
    assert.deepEqual(draft.applied, initial.applied);
    const applied = reportRangeReducer(draft, { type: "apply", today: "2026-11-07" });
    assert.equal(applied.preset, preset);
    assert.deepEqual(applied.applied, draftRange);
  }
});

test("manual dates that match no preset remain custom", () => {
  const draft = reportRangeReducer(initialReportRange("2026-11-07"), { type: "draft", range: { startDate: "2026-11-03", endDate: "2026-11-05" } });
  assert.equal(reportRangeReducer(draft, { type: "apply", today: "2026-11-07" }).preset, "custom");
});

test("overlapping preset ranges prefer Today for a manually applied single day", () => {
  const draft = reportRangeReducer(initialReportRange("2026-06-01"), { type: "draft", range: { startDate: "2026-06-01", endDate: "2026-06-01" } });
  assert.equal(reportRangeReducer(draft, { type: "apply", today: "2026-06-01" }).preset, "today");
});

test("quick preset replaces unsaved dates and Cancel retains the applied preset", () => {
  const initial = initialReportRange("2026-11-07");
  const draft = reportRangeReducer(initial, { type: "draft", range: { startDate: "2026-11-01", endDate: "2026-11-05" } });
  const cancelled = reportRangeReducer(draft, { type: "cancel" });
  assert.equal(cancelled.preset, "week");
  assert.deepEqual(cancelled.draft, initial.applied);
  const preset = reportRangeReducer(draft, { type: "preset", preset: "today", today: "2026-11-07" });
  assert.deepEqual(preset.draft, { startDate: "2026-11-07", endDate: "2026-11-07" });
  assert.deepEqual(preset.applied, preset.draft);
});

test("midnight advances an active preset without losing unsaved custom dates", () => {
  const initial = reportRangeReducer(initialReportRange("2026-11-07"), { type: "preset", preset: "today", today: "2026-11-07" });
  const draftRange = { startDate: "2026-11-01", endDate: "2026-11-05" };
  const draft = reportRangeReducer(initial, { type: "draft", range: draftRange });
  const nextDay = reportRangeReducer(draft, { type: "day", today: "2026-11-08" });
  assert.deepEqual(nextDay.applied, { startDate: "2026-11-08", endDate: "2026-11-08" });
  assert.deepEqual(nextDay.draft, draftRange);
  const cleanNextDay = reportRangeReducer(initial, { type: "day", today: "2026-11-08" });
  assert.deepEqual(cleanNextDay.draft, cleanNextDay.applied);
});

test("session details use the account timezone across midnight and preserve full notes", () => {
  const record = session("overnight", { startedAt: "2026-11-02T16:50:00Z", endedAt: "2026-11-02T17:15:00Z", notes: "First line\nSecond line" });
  const details = presentPomodoroSession(record, timeZone);
  assert.equal(details.date, "2 Nov 2026");
  assert.equal(details.startTime, "23:50");
  assert.equal(details.endTime, "00:15");
  assert.equal(details.endedAt, "3 Nov 2026, 00:15");
  assert.equal(details.hasNotes, true);
  assert.equal(record.notes, "First line\nSecond line");
});

test("sessions without a task or notes retain descriptive fallback labels", () => {
  assert.equal(presentPomodoroSession(session("free", { notes: "  " }), timeZone).title, "Free focus session");
  const rest = presentPomodoroSession(session("rest", { sessionType: "LONG_BREAK" }), timeZone);
  assert.equal(rest.title, "Break");
  assert.equal(rest.typeLabel, "Long break");
  assert.equal(rest.hasNotes, false);
});

test("session source uses stored identifiers rather than a title or project name", () => {
  assert.equal(presentPomodoroSession(session("calendar", { eventId: "event-1", projectName: "Calendar task" }), timeZone).sourceLabel, "Calendar");
  assert.equal(presentPomodoroSession(session("project", { projectId: "project-1", eventId: "event-1" }), timeZone).sourceLabel, "Project");
  assert.equal(presentPomodoroSession(session("free", { taskTitle: "Personal focus goal" }), timeZone).sourceLabel, "Free focus");
});

test("range validation rejects invalid, future, reversed and over-90-day dates", () => {
  for (const invalid of [
    { startDate: "2026-02-30", endDate: "2026-11-07" },
    { startDate: "2026-11-01", endDate: "2026-11-08" },
    { startDate: "2026-11-07", endDate: "2026-11-01" },
    { startDate: "2026-08-01", endDate: "2026-11-07" },
  ]) assert.ok(Object.keys(reportRangeErrors(invalid, now, timeZone)).length > 0);
  assert.deepEqual(reportRangeErrors({ startDate: "2026-08-10", endDate: "2026-11-07" }, now, timeZone), {});
});

test("the 90-day limit counts calendar dates across device daylight-saving changes", () => {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    assert.deepEqual(reportRangeErrors({ startDate: "2026-08-10", endDate: "2026-11-07" }, now, timeZone), {});
    assert.ok(reportRangeErrors({ startDate: "2026-08-09", endDate: "2026-11-07" }, now, timeZone).endDate);
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
});

test("report date errors share task/project required and ordering rules", () => {
  assert.equal(reportRangeErrors({ startDate: "", endDate: "2026-11-07" }, now, timeZone).startDate, DATE_RANGE_MESSAGES.startRequired);
  assert.equal(reportRangeErrors({ startDate: "2026-11-01", endDate: "" }, now, timeZone).endDate, DATE_RANGE_MESSAGES.endRequired);
  assert.equal(reportRangeErrors({ startDate: "2026-11-07", endDate: "2026-11-01" }, now, timeZone).endDate, DATE_RANGE_MESSAGES.endBeforeStart);
  assert.deepEqual(reportRangeErrors({ startDate: "2026-11-07", endDate: "2026-11-07" }, now, timeZone), {});
});

test("clearing From date clears To date and an incomplete range cannot be applied", () => {
  const initial = initialReportRange("2026-11-07");
  const cleared = reportRangeReducer(initial, { type: "draft", range: { startDate: "", endDate: initial.draft.endDate } });
  assert.deepEqual(cleared.draft, { startDate: "", endDate: "" });
  assert.deepEqual(reportRangeReducer(cleared, { type: "apply", today: "2026-11-07" }), cleared);
  assert.deepEqual(reportRangeReducer(cleared, { type: "cancel" }).draft, initial.applied);
});

test("reset restores the default applied dates and discards incomplete date drafts", () => {
  const month = reportRangeReducer(initialReportRange("2026-11-07"), { type: "preset", preset: "month", today: "2026-11-07" });
  const dirty = reportRangeReducer(month, { type: "draft", range: { startDate: "2026-10-15", endDate: "" } });
  const reset = reportRangeReducer(dirty, { type: "reset", today: "2026-11-07" });
  assert.deepEqual(reset, initialReportRange("2026-11-07"));
  assert.deepEqual(reset.draft, { startDate: "2026-11-02", endDate: "2026-11-07" });
});

test("reset recomputes this week from the current account date", () => {
  const previousWeek = initialReportRange("2026-11-07");
  const reset = reportRangeReducer(previousWeek, { type: "reset", today: "2026-11-09" });
  assert.equal(reset.preset, "week");
  assert.equal(reset.today, "2026-11-09");
  assert.deepEqual(reset.applied, { startDate: "2026-11-09", endDate: "2026-11-09" });
  assert.deepEqual(reset.draft, reset.applied);
});
