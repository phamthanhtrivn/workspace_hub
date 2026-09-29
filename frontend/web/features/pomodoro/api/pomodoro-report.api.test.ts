import { afterEach, expect, it, vi } from "vitest";
import { listCalendarPomodoroSessions } from "@/features/calendar/api/calendar.api";
import type { CalendarPomodoroSession } from "@/features/calendar/types/calendar.types";
import { getPomodoroReportSessions } from "./pomodoro-report.api";

vi.mock("@/features/calendar/api/calendar.api", () => ({ listCalendarPomodoroSessions: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const range = { startDate: "2026-09-01", endDate: "2026-09-30" };
function response(page: number, ids: string[]) {
  return {
    sessions: ids.map((id) => ({ id, taskId: null, eventId: null, notes: "saved note" } as CalendarPomodoroSession)),
    summary: { focusSeconds: 3000, completedFocusSessions: 2 },
    pagination: { page, limit: 1000, totalItems: 2, totalPages: 2 },
  };
}

it("loads every server page and deduplicates sessions before reporting/export", async () => {
  vi.mocked(listCalendarPomodoroSessions).mockResolvedValueOnce(response(1, ["first"])).mockResolvedValueOnce(response(2, ["first", "second"]));
  const signal = new AbortController().signal;
  const result = await getPomodoroReportSessions(range, signal);
  expect(result.map((item) => item.id)).toEqual(["first", "second"]);
  expect(result[0].taskId).toBeUndefined();
  expect(result[0].notes).toBe("saved note");
  expect(listCalendarPomodoroSessions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 1000 }), signal);
});

it("fails the report if a later page fails instead of exporting incomplete totals", async () => {
  vi.mocked(listCalendarPomodoroSessions).mockResolvedValueOnce(response(1, ["first"])).mockRejectedValueOnce(new Error("Offline"));
  await expect(getPomodoroReportSessions(range)).rejects.toThrow("Offline");
});
