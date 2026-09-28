import { beforeEach, expect, it, vi } from "vitest";
import { getCalendarEvents, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventSourceType, EventStatus, type CalendarEvent, type WorkspaceCalendar } from "@/features/calendar/types/calendar.types";
import { getTodayCalendarTasks } from "./today-calendar-tasks";

vi.mock("@/features/calendar/api/calendar.api", () => ({
  getCalendarEvents: vi.fn(),
  getCalendars: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it("fetches one local day and keeps only visible personal Calendar tasks", async () => {
  const midday = new Date();
  midday.setHours(12, 0, 0, 0);
  const nextMidnight = new Date(midday);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  const task = (id: string, calendarId: string, extra: Partial<CalendarEvent> = {}) => ({
    id, calendarId, sourceType: EventSourceType.TASK,
    status: EventStatus.CONFIRMED, completedAt: null,
    startAt: midday.toISOString(), endAt: new Date(midday.getTime() + 3_600_000).toISOString(),
    ...extra,
  }) as CalendarEvent;
  vi.mocked(getCalendars).mockResolvedValue([
    { id: "personal-calendar", projectId: null } as WorkspaceCalendar,
    { id: "project-calendar", projectId: "project-1" } as WorkspaceCalendar,
  ]);
  vi.mocked(getCalendarEvents).mockResolvedValue([
    task("personal", "personal-calendar"),
    task("project", "project-calendar"),
    task("someone-else-public-task", "other-user-calendar"),
    task("completed", "personal-calendar", { completedAt: new Date().toISOString() }),
    task("cancelled", "personal-calendar", { status: EventStatus.CANCELLED }),
    task("meeting", "personal-calendar", { sourceType: EventSourceType.USER }),
    task("tomorrow", "personal-calendar", { startAt: nextMidnight.toISOString(), endAt: new Date(nextMidnight.getTime() + 3_600_000).toISOString() }),
  ]);

  const result = await getTodayCalendarTasks();

  expect(result.map((event) => event.id)).toEqual(["personal"]);
  const filters = vi.mocked(getCalendarEvents).mock.calls[0][0];
  const start = new Date(filters.startAt!);
  const end = new Date(filters.endAt!);
  expect(start.getHours()).toBe(0);
  expect(start.getMinutes()).toBe(0);
  expect(end.getTime() - start.getTime()).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000 - 1);
  expect(end.getTime() - start.getTime()).toBeLessThanOrEqual(25 * 60 * 60 * 1000 - 1);
});
