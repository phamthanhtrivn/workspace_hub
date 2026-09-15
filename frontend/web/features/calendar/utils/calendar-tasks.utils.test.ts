import { describe, expect, it } from "vitest";
import {
  CalendarEvent,
  EventSourceType,
  EventStatus,
  EventVisibility,
  WorkspaceCalendar,
} from "../types/calendar.types";
import {
  formatTaskDueDate,
  groupCalendarTasks,
  isProjectCalendarTask,
} from "./calendar-tasks.utils";

function makeMockTask(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "task-1",
    calendarId: "cal-1",
    createdBy: "user-1",
    updatedBy: null,
    title: "Test Task",
    description: null,
    location: null,
    startAt: "2026-09-14T10:00:00.000Z",
    endAt: "2026-09-14T11:00:00.000Z",
    allDay: false,
    color: "#f59e0b",
    status: EventStatus.CONFIRMED,
    visibility: EventVisibility.DEFAULT,
    recurrenceRule: null,
    recurrenceParentId: null,
    timeZone: "Asia/Ho_Chi_Minh",
    originalStartAt: null,
    sourceType: EventSourceType.TASK,
    sourceId: null,
    completedAt: null,
    exceptionDates: [],
    documentIds: [],
    cancelledAt: null,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: "2026-09-14T08:00:00.000Z",
    ...overrides,
  };
}

describe("calendar-tasks.utils", () => {
  const refDate = new Date("2026-09-14T12:00:00.000Z");

  it("distinguishes project tasks from personal calendar tasks", () => {
    const personalTask = makeMockTask({
      calendar: { projectId: null } as WorkspaceCalendar,
    });
    const projectTask = makeMockTask({
      calendar: { projectId: "project-1" } as WorkspaceCalendar,
    });

    expect(isProjectCalendarTask(personalTask)).toBe(false);
    expect(isProjectCalendarTask(projectTask)).toBe(true);
  });

  describe("groupCalendarTasks", () => {
    it("groups tasks into overdue, today, upcoming, and completed", () => {
      const overdueTask = makeMockTask({
        id: "t-overdue",
        title: "Overdue Task",
        startAt: "2026-09-11T09:00:00.000Z",
      });
      const expiredOverdueTask = makeMockTask({
        id: "t-expired-overdue",
        title: "Expired Overdue Task",
        startAt: "2026-09-10T09:00:00.000Z",
      });
      const todayTask = makeMockTask({
        id: "t-today",
        title: "Today Task",
        startAt: "2026-09-14T15:00:00.000Z",
      });
      const tomorrowTask = makeMockTask({
        id: "t-upcoming",
        title: "Upcoming Task",
        startAt: "2026-09-15T10:00:00.000Z",
      });
      const laterTask = makeMockTask({
        id: "t-later",
        title: "Later Task",
        startAt: "2026-09-16T10:00:00.000Z",
      });
      const completedTask = makeMockTask({
        id: "t-completed",
        title: "Completed Task",
        startAt: "2026-09-13T09:00:00.000Z",
        completedAt: "2026-09-14T11:00:00.000Z",
      });

      const grouped = groupCalendarTasks(
        [
          todayTask,
          overdueTask,
          expiredOverdueTask,
          completedTask,
          tomorrowTask,
          laterTask,
        ],
        refDate,
      );

      expect(grouped.overdue).toHaveLength(1);
      expect(grouped.overdue[0].id).toBe("t-overdue");
      expect(
        grouped.overdue.some((task) => task.id === "t-expired-overdue"),
      ).toBe(false);

      expect(grouped.today).toHaveLength(1);
      expect(grouped.today[0].id).toBe("t-today");

      expect(grouped.upcoming).toHaveLength(1);
      expect(grouped.upcoming[0].id).toBe("t-upcoming");
      expect(grouped.upcoming.some((task) => task.id === "t-later")).toBe(
        false,
      );

      expect(grouped.completed).toHaveLength(1);
      expect(grouped.completed[0].id).toBe("t-completed");
    });

    it("sorts uncompleted tasks by startAt ascending", () => {
      const task1 = makeMockTask({
        id: "t-1",
        startAt: "2026-09-14T16:00:00.000Z",
      });
      const task2 = makeMockTask({
        id: "t-2",
        startAt: "2026-09-14T08:00:00.000Z",
      });

      const grouped = groupCalendarTasks([task1, task2], refDate);
      expect(grouped.today.map((t) => t.id)).toEqual(["t-2", "t-1"]);
    });

    it("sorts completed tasks by completedAt descending", () => {
      const task1 = makeMockTask({
        id: "t-1",
        startAt: "2026-09-14T08:00:00.000Z",
        completedAt: "2026-09-14T09:00:00.000Z",
      });
      const task2 = makeMockTask({
        id: "t-2",
        startAt: "2026-09-14T08:00:00.000Z",
        completedAt: "2026-09-14T11:00:00.000Z",
      });

      const grouped = groupCalendarTasks([task1, task2], refDate);
      expect(grouped.completed.map((t) => t.id)).toEqual(["t-2", "t-1"]);
    });
  });

  describe("formatTaskDueDate", () => {
    it("formats today for allDay and timed tasks", () => {
      const todayIso = "2026-09-14T14:30:00.000Z";
      expect(formatTaskDueDate(todayIso, true, "vi", refDate)).toBe("Hôm nay");
      expect(formatTaskDueDate(todayIso, true, "en", refDate)).toBe("Today");
    });

    it("formats yesterday and tomorrow correctly", () => {
      const yesterdayIso = "2026-09-13T10:00:00.000Z";
      const tomorrowIso = "2026-09-15T10:00:00.000Z";

      expect(formatTaskDueDate(yesterdayIso, true, "vi", refDate)).toBe(
        "Hôm qua",
      );
      expect(formatTaskDueDate(tomorrowIso, true, "vi", refDate)).toBe(
        "Ngày mai",
      );
    });
  });
});
