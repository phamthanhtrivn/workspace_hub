import { createCalendarEvent, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventSourceType } from "@/features/calendar/types/calendar.types";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";

export function defaultFocusStart(): string {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

interface ScheduleFocusTaskInput {
  calendarId?: string;
  title: string;
  startsAt: string;
  pomodoros: number;
  focusDurationMinutes?: number;
  description?: string;
}

export async function scheduleFocusTask({
  calendarId,
  title,
  startsAt,
  pomodoros,
  focusDurationMinutes = 25,
  description,
}: ScheduleFocusTaskInput): Promise<string> {
  const start = new Date(startsAt);
  if (!startsAt || Number.isNaN(start.getTime())) {
    throw new Error("Please choose a valid start date and time.");
  }
  if (!title.trim() || title.length > POMODORO_TASK_SETTINGS.maxGoalTitleLength || !Number.isInteger(pomodoros) || pomodoros < 1 || pomodoros > POMODORO_TASK_SETTINGS.maxCalendarSessions) {
    throw new Error("Enter a valid title and between 1 and 20 focus sessions.");
  }

  const calendars = await getCalendars();
  const calendar = calendarId
    ? calendars.find((calendar) => calendar.id === calendarId && !calendar.projectId)
    : calendars.find((calendar) => !calendar.projectId && calendar.isDefault) ?? calendars.find((calendar) => !calendar.projectId);
  if (!calendar) {
    throw new Error("Create a calendar before saving a task.");
  }

  const event = await createCalendarEvent({
    calendarId: calendar.id,
    title,
    description: description?.trim() || undefined,
    startAt: start.toISOString(),
    endAt: new Date(
      start.getTime() + pomodoros * focusDurationMinutes * 60_000,
    ).toISOString(),
    sourceType: EventSourceType.TASK,
    color: "#f59e0b",
  });
  return event.id;
}
