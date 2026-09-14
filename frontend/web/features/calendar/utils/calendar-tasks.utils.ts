import { CalendarEvent, CalendarGroupedTasks } from "../types/calendar.types";

export function groupCalendarTasks(
  tasks: CalendarEvent[],
  referenceDate: Date = new Date(),
): CalendarGroupedTasks {
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
  const endOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
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

    const taskDate = new Date(task.startAt);
    if (taskDate.getTime() < startOfToday.getTime()) {
      overdue.push(task);
    } else if (taskDate.getTime() <= endOfToday.getTime()) {
      today.push(task);
    } else {
      upcoming.push(task);
    }
  }

  overdue.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  today.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  upcoming.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  completed.sort((a, b) => {
    const timeA = a.completedAt
      ? new Date(a.completedAt).getTime()
      : new Date(a.startAt).getTime();
    const timeB = b.completedAt
      ? new Date(b.completedAt).getTime()
      : new Date(b.startAt).getTime();
    return timeB - timeA;
  });

  return { overdue, today, upcoming, completed };
}

export function formatTaskDueDate(
  startAt: string,
  allDay: boolean,
  locale: string = "vi",
  referenceDate: Date = new Date(),
): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";

  const isVi = locale.toLowerCase().startsWith("vi");

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
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
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
    const isCurrentYear = date.getFullYear() === referenceDate.getFullYear();
    datePrefix = date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      ...(isCurrentYear ? {} : { year: "numeric" }),
    });
  }

  if (allDay) {
    return datePrefix;
  }

  const timeStr = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !isVi,
  });

  return `${datePrefix}, ${timeStr}`;
}

