import { Temporal } from "temporal-polyfill";
import type {
  CalendarEvent,
  CalendarPomodoroSession,
} from "@/features/calendar/types/calendar.types";
import type { UpcomingMeetingItem } from "@/features/meeting/types/meeting.types";
import type {
  DashboardTask,
  DayItem,
  FocusDay,
} from "../types/dashboard.types";

export function dateInZone(value: string, zone: string): string {
  try {
    return Temporal.Instant.from(value)
      .toZonedDateTimeISO(zone)
      .toPlainDate()
      .toString();
  } catch {
    return "";
  }
}

export function dayBounds(date: string, zone: string) {
  const day = Temporal.PlainDate.from(date);
  return {
    startAt: day.toZonedDateTime(zone).toInstant().toString(),
    endAt: day.add({ days: 1 }).toZonedDateTime(zone).toInstant().toString(),
  };
}

export function taskDate(task: DashboardTask, zone: string) {
  if (!task.dueAt) return "";
  return task.dateOnly ? task.dueAt.slice(0, 10) : dateInZone(task.dueAt, zone);
}

export function taskBucket(task: DashboardTask, today: string, zone: string) {
  const due = taskDate(task, zone);
  return !due
    ? "No deadline"
    : due < today
      ? "Overdue"
      : due === today
        ? "Today"
        : "Upcoming";
}

export function sortTasks(tasks: DashboardTask[], today: string, zone: string) {
  const buckets: Record<string, number> = {
    Overdue: 0,
    Today: 1,
    Upcoming: 2,
    "No deadline": 3,
  };
  const priorities: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return [...new Map(tasks.map((task) => [task.key, task])).values()].sort(
    (a, b) =>
      buckets[taskBucket(a, today, zone)] -
        buckets[taskBucket(b, today, zone)] ||
      (priorities[a.priority] ?? 2) - (priorities[b.priority] ?? 2) ||
      (a.dueAt || "9999").localeCompare(b.dueAt || "9999") ||
      a.title.localeCompare(b.title),
  );
}

export function buildDayItems(
  events: CalendarEvent[],
  tasks: DashboardTask[],
  meetings: UpcomingMeetingItem[],
  today: string,
  zone: string,
): DayItem[] {
  const { startAt, endAt } = dayBounds(today, zone);
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  const meetingEventIds = new Set(
    meetings
      .map(
        (meeting) =>
          meeting.description?.match(
            /\[Calendar Event:([a-zA-Z0-9_-]+)\]/,
          )?.[1],
      )
      .filter(Boolean),
  );
  const meetingIds = new Set(meetings.map((meeting) => meeting.id));
  const meetingTokens = new Set(meetings.map((meeting) => meeting.joinToken));
  const items = new Map<string, DayItem>();
  for (const event of events) {
    if (
      event.status === "CANCELLED" ||
      event.cancelledAt ||
      event.sourceType === "TASK" ||
      event.description?.includes("[TASK]")
    )
      continue;
    const linkedToken =
      event.location?.match(/\/meetings\/([A-Za-z0-9_-]+)(?:[/?#]|$)/)?.[1] ||
      event.location;
    if (
      meetingEventIds.has(event.id) ||
      (event.sourceId && meetingIds.has(event.sourceId)) ||
      (linkedToken && meetingTokens.has(linkedToken))
    )
      continue;
    if (Date.parse(event.startAt) >= end || Date.parse(event.endAt) <= start)
      continue;
    const key = `event:${event.id}:${event.originalStartAt || event.startAt}`;
    items.set(key, {
      key,
      title: event.title,
      href: `/calendar?event=${encodeURIComponent(event.id)}`,
      kind: "Event",
      at: event.startAt,
      allDay: Boolean(event.allDay),
    });
  }
  for (const task of tasks) {
    if (taskDate(task, zone) !== today || !task.dueAt) continue;
    items.set(task.key, {
      key: task.key,
      title: task.title,
      href: task.href,
      kind: "Task",
      at: task.dueAt,
      allDay: task.dateOnly,
    });
  }
  for (const meeting of meetings) {
    if (
      !meeting.scheduledStartAt ||
      !meeting.scheduledEndAt ||
      meeting.status === "CANCELLED" ||
      meeting.status === "ENDED"
    )
      continue;
    if (
      Date.parse(meeting.scheduledStartAt) >= end ||
      Date.parse(meeting.scheduledEndAt) <= start
    )
      continue;
    const key = `meeting:${meeting.id}`;
    items.set(key, {
      key,
      title: meeting.title,
      href: `/meetings/${encodeURIComponent(meeting.joinToken)}`,
      kind: "Meeting",
      at: meeting.scheduledStartAt,
      allDay: false,
    });
  }
  return [...items.values()].sort(
    (a, b) =>
      Number(b.allDay) - Number(a.allDay) ||
      Date.parse(a.at) - Date.parse(b.at),
  );
}

export function focusDays(
  sessions: CalendarPomodoroSession[],
  today: string,
  zone: string,
): FocusDay[] {
  const end = Temporal.PlainDate.from(today);
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: end.subtract({ days: 6 - index }).toString(),
    minutes: 0,
    sessions: 0,
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const session of new Map(
    sessions.map((item) => [item.id, item]),
  ).values()) {
    if (session.sessionType !== "FOCUS") continue;
    const day = byDate.get(dateInZone(session.startedAt, zone));
    if (!day) continue;
    day.minutes += Math.max(0, session.actualSeconds) / 60;
    if (session.status === "COMPLETED") day.sessions += 1;
  }
  return days;
}

export function formatMinutes(minutes: number) {
  const whole = Math.floor(minutes);
  return whole >= 60
    ? `${Math.floor(whole / 60)}h ${whole % 60}m`
    : `${whole}m`;
}

export function formatTime(value: string, zone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
