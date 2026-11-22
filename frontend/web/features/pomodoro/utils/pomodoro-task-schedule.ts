import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import type { Task } from "@/features/project/types/project";
import { Temporal } from "temporal-polyfill";
import { getExclusiveAllDayEndDateKey } from "@/features/calendar/utils/calendar-date.utils";
import { formatDateOnly, formatInTimezone, getDisplayTimezone, zonedDateKey } from "@/lib/timezone";
import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { POMODORO_TASK_COPY as taskCopy } from "../constants/pomodoro-task";

export function formatPomodoroProjectTaskSchedule(task: Pick<Task, "startDate" | "dueDate"> & Partial<Pick<Task, "allDay">>): string {
  const date = (value: string | undefined) => {
    if (!value || !Number.isFinite(Date.parse(value))) return "";
    return (task.allDay || value.length === 10 ? formatDateOnly : formatInTimezone)(value, POMODORO_DISPLAY_LOCALE, { day: "2-digit", month: "short", year: "numeric" });
  };
  const start = date(task.startDate), due = date(task.dueDate);
  if (start && due) return start + " – " + due;
  if (due) return taskCopy.due + " " + due;
  if (start) return taskCopy.starts + " " + start;
  return copy.unscheduled;
}

export function formatPomodoroTaskSchedule(event: Pick<CalendarEvent, "startAt" | "endAt" | "allDay"> & Partial<Pick<CalendarEvent, "timeZone">>, today = new Date()): string {
  const start = new Date(event.startAt), end = new Date(event.endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return copy.unscheduled;
  const timeZone = event.allDay ? event.timeZone || getDisplayTimezone() : getDisplayTimezone();
  const date = (value: Date) => formatInTimezone(value, POMODORO_DISPLAY_LOCALE, { day: "2-digit", month: "short", year: "numeric" }, timeZone);
  const time = (value: Date) => formatInTimezone(value, POMODORO_DISPLAY_LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, timeZone);
  const startDay = zonedDateKey(start, timeZone), todayKey = zonedDateKey(today);
  if (event.allDay) {
    const lastDay = Temporal.PlainDate.from(getExclusiveAllDayEndDateKey(end, start, timeZone)).subtract({ days: 1 }).toString();
    const dayLabel = (value: string) => formatDateOnly(value, POMODORO_DISPLAY_LOCALE, { day: "2-digit", month: "short", year: "numeric" });
    if (startDay !== lastDay) return dayLabel(startDay) + " – " + dayLabel(lastDay) + " · " + copy.allDay;
    return startDay === todayKey ? copy.allDay : dayLabel(startDay) + " · " + copy.allDay;
  }
  if (startDay !== zonedDateKey(end, timeZone)) return date(start) + " " + time(start) + " – " + date(end) + " " + time(end);
  const range = time(start) + "–" + time(end);
  return startDay === todayKey ? range : date(start) + " · " + range;
}
