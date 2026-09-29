import { expect, it } from "vitest";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { buildPomodoroReport, createReportExport, presetReportRange, reportFilterOptions, reportRangeBounds } from "./pomodoro-report";

const range = { startDate: "2026-09-28", endDate: "2026-09-29" };
const all = { project: "", task: "" };
const session = (id: string, changes: Partial<PomodoroSessionRecord> = {}): PomodoroSessionRecord => ({
  id, taskId: id, taskTitle: "Same title", sessionType: "FOCUS", status: "COMPLETED",
  startedAt: new Date(2026, 8, 29, 10).toISOString(), endedAt: new Date(2026, 8, 29, 10, 25).toISOString(),
  actualSeconds: 1500, durationMinutes: 25, ...changes,
});

it("uses Monday through Sunday for weeks and the actual last day for months", () => {
  expect(presetReportRange("week", new Date(2026, 8, 27, 12))).toEqual({ startDate: "2026-09-21", endDate: "2026-09-27" });
  expect(presetReportRange("month", new Date(2024, 1, 29, 12))).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
  expect(presetReportRange("today", new Date(2026, 8, 29, 23))).toEqual({ startDate: "2026-09-29", endDate: "2026-09-29" });
});

it("includes the entire last local day and rejects invalid or excessive ranges", () => {
  const bounds = reportRangeBounds(range);
  expect(bounds.startAt).toBe(new Date(2026, 8, 28).toISOString());
  expect(bounds.endAt).toBe(new Date(2026, 8, 30).toISOString());
  expect(() => reportRangeBounds({ startDate: "2026-02-30", endDate: "2026-03-01" })).toThrow();
  expect(() => reportRangeBounds({ startDate: "", endDate: "2026-03-01" })).toThrow();
  expect(() => reportRangeBounds({ startDate: "2026-09-30", endDate: "2026-09-29" })).toThrow();
  expect(() => reportRangeBounds({ startDate: "2026-01-01", endDate: "2026-05-01" })).toThrow("93 ngày");
});

it("sums actual focus seconds, excludes breaks, and retains zero-activity days", () => {
  const report = buildPomodoroReport([
    session("completed"), session("stopped", { status: "STOPPED", actualSeconds: 83 }),
    session("skipped", { status: "SKIPPED", actualSeconds: 12 }),
    session("break", { sessionType: "SHORT_BREAK", actualSeconds: 300 }),
    session("outside", { startedAt: new Date(2026, 8, 30).toISOString() }),
  ], range, all);
  expect(report.summary).toEqual({ totalSessions: 4, focusSeconds: 1595, completedFocusSessions: 1, stoppedFocusSessions: 1, skippedFocusSessions: 1 });
  expect(report.daily[0]).toEqual({ date: "2026-09-28", focusSeconds: 0, completedFocusSessions: 0, totalSessions: 0 });
  expect(report.daily[1].focusSeconds).toBe(1595);
});

it("filters projects and distinct task IDs even when task names match", () => {
  const sessions = [session("a", { projectId: "p1", projectName: "Deleted project" }), session("b", { projectId: "p2", projectName: "Other project" }), session("c", { eventId: "event-c" })];
  const report = buildPomodoroReport(sessions, range, { project: "p1", task: "task:a" });
  expect(report.sessions.map((item) => item.id)).toEqual(["a"]);
  expect(reportFilterOptions(sessions, "p1").tasks).toEqual([["task:a", "Same title"]]);
  expect(reportFilterOptions(sessions).projects).toContainEqual(["p1", "Deleted project"]);
  expect(buildPomodoroReport(sessions, range, { project: "personal", task: "" }).sessions[0].id).toBe("c");
});

it("exports all filtered records, notes, date bounds and matching totals", () => {
  const sessions = Array.from({ length: 25 }, (_, index) => session(String(index), { notes: "Ghi chú\nnhiều dòng", projectId: "p1" }));
  const filters = { project: "p1", task: "" };
  const report = buildPomodoroReport(sessions, range, filters);
  const exported = JSON.parse(JSON.stringify(createReportExport(report, range, filters)));
  expect(exported.sessions).toHaveLength(25);
  expect(exported.sessions[0].notes).toBe("Ghi chú\nnhiều dòng");
  expect(exported.summary.focusSeconds).toBe(25 * 1500);
  expect(exported.filters).toEqual(filters);
  expect(exported.range).toEqual({ ...range, ...reportRangeBounds(range) });
  expect(exported.timeZone).toBeTruthy();
});
