import { CalendarEvent, CalendarGroupedTasks } from "../types/calendar.types";
import { getDisplayTimezone, toZonedDateTimeInput, zonedDateKey } from "@/lib/timezone";

function taskWallDate(task: CalendarEvent, timeZone = getDisplayTimezone()): Date {
  const due = getTaskDueDate(task);
  const zone = task.allDay ? task.timeZone || task.calendar?.timeZone || timeZone : timeZone;
  return new Date(`${zonedDateKey(due, zone)}T12:00:00`);
}

export function isProjectCalendarTask(task: CalendarEvent): boolean {
  return Boolean(task.calendar?.projectId);
}

export function getTaskDueDate(
  task: Pick<CalendarEvent, "startAt" | "endAt" | "allDay"> & Partial<Pick<CalendarEvent, "timeZone">>,
): Date {
  const end = new Date(task.endAt || task.startAt);
  if (Number.isNaN(end.getTime())) {
    return new Date(task.startAt);
  }
  if (task.allDay) {
    const start = new Date(task.startAt);
    if (
      !Number.isNaN(start.getTime()) &&
      end.getTime() > start.getTime() &&
      toZonedDateTimeInput(end, task.timeZone || getDisplayTimezone()).endsWith("T00:00") &&
      end.getUTCSeconds() === 0 &&
      end.getMilliseconds() === 0
    ) {
      return new Date(end.getTime() - 1);
    }
  }
  return end;
}

export type TaskTimeFilter = "all" | "today" | "week" | "month" | "overdue";
export type TaskStatusFilter = "all" | "active" | "completed";

export function filterCalendarTasks(
  tasks: CalendarEvent[],
  timeFilter: TaskTimeFilter = "all",
  statusFilter: TaskStatusFilter = "all",
  referenceDate: Date = new Date(),
  timeZone = getDisplayTimezone(),
): CalendarEvent[] {
  referenceDate = new Date(`${zonedDateKey(referenceDate, timeZone)}T12:00:00`);
  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );
  const endOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );

  return tasks.filter((task) => {
    // 1. Status Filter
    const isCompleted = Boolean(task.completedAt);
    if (statusFilter === "active" && isCompleted) return false;
    if (statusFilter === "completed" && !isCompleted) return false;

    // 2. Time Filter
    if (timeFilter === "all") return true;

    const taskTime = taskWallDate(task, timeZone).getTime();

    if (timeFilter === "overdue") {
      return !isCompleted && taskTime < startOfToday.getTime();
    }

    if (timeFilter === "today") {
      return (
        taskTime >= startOfToday.getTime() && taskTime <= endOfToday.getTime()
      );
    }

    if (timeFilter === "week") {
      const dayOfWeek = referenceDate.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const startOfWeek = new Date(referenceDate);
      startOfWeek.setDate(referenceDate.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return (
        taskTime >= startOfWeek.getTime() && taskTime <= endOfWeek.getTime()
      );
    }

    if (timeFilter === "month") {
      const startOfMonth = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const endOfMonth = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      return (
        taskTime >= startOfMonth.getTime() && taskTime <= endOfMonth.getTime()
      );
    }

    return true;
  });
}

export function filterTasksByTime(
  tasks: CalendarEvent[],
  filter: TaskTimeFilter,
  referenceDate: Date = new Date(),
): CalendarEvent[] {
  return filterCalendarTasks(tasks, filter, "all", referenceDate);
}

export function groupCalendarTasks(
  tasks: CalendarEvent[],
  referenceDate: Date = new Date(),
  options?: { allUpcoming?: boolean; allOverdue?: boolean },
  timeZone = getDisplayTimezone(),
): CalendarGroupedTasks {
  referenceDate = new Date(`${zonedDateKey(referenceDate, timeZone)}T12:00:00`);
  const overdue: CalendarEvent[] = [];
  const today: CalendarEvent[] = [];
  const upcoming: CalendarEvent[] = [];
  const completed: CalendarEvent[] = [];

  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );
  const startOfOverdueWindow = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - 3,
    0,
    0,
    0,
    0,
  );
  const endOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );
  const endOfTomorrow = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + 1,
    23,
    59,
    59,
    999,
  );

  for (const task of tasks) {
    if (task.completedAt) {
      completed.push(task);
      continue;
    }

    const taskDate = taskWallDate(task, timeZone);
    if (taskDate.getTime() < startOfToday.getTime()) {
      if (
        options?.allOverdue ||
        taskDate.getTime() >= startOfOverdueWindow.getTime()
      ) {
        overdue.push(task);
      }
      continue;
    }

    if (taskDate.getTime() <= endOfToday.getTime()) {
      today.push(task);
    } else if (
      options?.allUpcoming ||
      taskDate.getTime() <= endOfTomorrow.getTime()
    ) {
      upcoming.push(task);
    }
  }

  overdue.sort(
    (a, b) => getTaskDueDate(a).getTime() - getTaskDueDate(b).getTime(),
  );

  today.sort(
    (a, b) => getTaskDueDate(a).getTime() - getTaskDueDate(b).getTime(),
  );

  upcoming.sort(
    (a, b) => getTaskDueDate(a).getTime() - getTaskDueDate(b).getTime(),
  );

  completed.sort((a, b) => {
    const timeA = a.completedAt
      ? new Date(a.completedAt).getTime()
      : getTaskDueDate(a).getTime();
    const timeB = b.completedAt
      ? new Date(b.completedAt).getTime()
      : getTaskDueDate(b).getTime();
    return timeB - timeA;
  });

  return { overdue, today, upcoming, completed };
}

export function formatTaskDueDate(
  startAt: string,
  allDay: boolean,
  locale: string = "vi",
  referenceDate: Date = new Date(),
  timeZone = getDisplayTimezone(),
): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";

  const isVi = locale.toLowerCase().startsWith("vi");
  const taskDay = new Date(`${zonedDateKey(date, timeZone)}T12:00:00`);
  referenceDate = new Date(`${zonedDateKey(referenceDate)}T12:00:00`);

  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );

  const startOfTaskDay = new Date(
    taskDay.getFullYear(),
    taskDay.getMonth(),
    taskDay.getDate(),
    0,
    0,
    0,
    0,
  );

  const diffDays = Math.round(
    (startOfTaskDay.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  let datePrefix = "";
  if (diffDays === 0) {
    datePrefix = isVi ? "Hôm nay" : "Today";
  } else if (diffDays === -1) {
    datePrefix = isVi ? "Hôm qua" : "Yesterday";
  } else if (diffDays === 1) {
    datePrefix = isVi ? "Ngày mai" : "Tomorrow";
  } else {
    const isCurrentYear = taskDay.getFullYear() === referenceDate.getFullYear();
    datePrefix = date.toLocaleDateString(locale, {
      timeZone,
      month: "short",
      day: "numeric",
      ...(isCurrentYear ? {} : { year: "numeric" }),
    });
  }

  if (allDay) {
    return datePrefix;
  }

  const timeStr = date.toLocaleTimeString(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: !isVi,
  });

  return `${datePrefix}, ${timeStr}`;
}
