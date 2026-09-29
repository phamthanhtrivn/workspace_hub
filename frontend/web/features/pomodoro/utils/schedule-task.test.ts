import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendarEvent, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventSourceType } from "@/features/calendar/types/calendar.types";
import { scheduleFocusTask } from "./schedule-task";

vi.mock("@/features/calendar/api/calendar.api", () => ({
  createCalendarEvent: vi.fn(),
  getCalendars: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createCalendarEvent).mockResolvedValue({ id: "calendar-event-1" } as Awaited<ReturnType<typeof createCalendarEvent>>);
  vi.mocked(getCalendars).mockResolvedValue([
    { id: "project", projectId: "p1", isDefault: false },
    { id: "personal", projectId: null, isDefault: true },
  ] as Awaited<ReturnType<typeof getCalendars>>);
});

describe("scheduleFocusTask", () => {
  it("creates a Calendar task in the personal calendar with the selected duration", async () => {
    const eventId = await scheduleFocusTask({
      title: "Write report",
      startsAt: "2026-09-27T09:30",
      pomodoros: 2,
      focusDurationMinutes: 40,
      description: "Draft the executive summary",
    });
    expect(eventId).toBe("calendar-event-1");

    expect(createCalendarEvent).toHaveBeenCalledWith({
      calendarId: "personal",
      title: "Write report",
      description: "Draft the executive summary",
      startAt: new Date("2026-09-27T09:30").toISOString(),
      endAt: new Date(new Date("2026-09-27T09:30").getTime() + 80 * 60_000).toISOString(),
      sourceType: EventSourceType.TASK,
      color: "#f59e0b",
    });
  });

  it("does not create a task when no calendar exists", async () => {
    vi.mocked(getCalendars).mockResolvedValue([]);

    await expect(scheduleFocusTask({
      title: "Write report",
      startsAt: "2026-09-27T09:30",
      pomodoros: 2,
    })).rejects.toThrow("Chưa có lịch");
    expect(createCalendarEvent).not.toHaveBeenCalled();
  });
});
