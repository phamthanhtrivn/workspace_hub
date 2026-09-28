import { getCalendarEvents, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventStatus, type CalendarEvent } from "@/features/calendar/types/calendar.types";
import { isTaskCalendarEvent } from "@/features/calendar/utils/calendar-event.utils";

export async function getTodayCalendarTasks(): Promise<CalendarEvent[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const endInclusive = new Date(end.getTime() - 1);

  const [events, calendars] = await Promise.all([
    getCalendarEvents({ startAt: start.toISOString(), endAt: endInclusive.toISOString() }),
    getCalendars(),
  ]);
  const personalCalendarIds = new Set(
    calendars.filter((calendar) => !calendar.projectId).map((calendar) => calendar.id),
  );

  return events
    .filter((event) =>
      isTaskCalendarEvent(event) &&
      new Date(event.startAt) < end &&
      new Date(event.endAt) > start &&
      event.status !== EventStatus.CANCELLED &&
      !event.completedAt &&
      personalCalendarIds.has(event.calendarId),
    )
    .sort((first, second) => {
      const firstOrder = first.taskOrder ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.taskOrder ?? Number.MAX_SAFE_INTEGER;
      return firstOrder - secondOrder ||
        new Date(first.startAt).getTime() - new Date(second.startAt).getTime();
    });
}
