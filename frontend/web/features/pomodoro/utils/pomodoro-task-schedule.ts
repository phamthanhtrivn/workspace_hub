import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import type { Task } from "@/features/project/types/project";
import { formatLocalDateKey, getExclusiveAllDayEndDateKey, isAllDayDateTimeRange } from "@/features/calendar/utils/calendar-date.utils";
import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { POMODORO_TASK_COPY as taskCopy } from "../constants/pomodoro-task";

export function formatPomodoroProjectTaskSchedule(task: Pick<Task, "startDate" | "dueDate">): string {
  const date = (value: string | undefined) => {
    if (!value || !Number.isFinite(Date.parse(value))) return "";
    return new Date(value).toLocaleDateString(POMODORO_DISPLAY_LOCALE, { day: "2-digit", month: "short", year: "numeric" });
  };
  const start = date(task.startDate);
  const due = date(task.dueDate);
  if (start && due) return `${start} – ${due}`;
  if (due) return `${taskCopy.due} ${due}`;
  if (start) return `${taskCopy.starts} ${start}`;
  return copy.unscheduled;
}

export function formatPomodoroTaskSchedule(event: Pick<CalendarEvent, "startAt" | "endAt" | "allDay">, today = new Date()): string {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return copy.unscheduled;
  const allDay = event.allDay || isAllDayDateTimeRange(start, end);
  const date = (value: Date) => value.toLocaleDateString(POMODORO_DISPLAY_LOCALE, { day: "2-digit", month: "short", year: "numeric" });
  const time = (value: Date) => value.toLocaleTimeString(POMODORO_DISPLAY_LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false });
  if (allDay) {
    const lastDay = new Date(`${getExclusiveAllDayEndDateKey(end, start)}T00:00:00`);
    lastDay.setDate(lastDay.getDate() - 1);
    if (formatLocalDateKey(start) !== formatLocalDateKey(lastDay)) return `${date(start)} – ${date(lastDay)} · ${copy.allDay}`;
    return formatLocalDateKey(start) === formatLocalDateKey(today) ? copy.allDay : `${date(start)} · ${copy.allDay}`;
  }
  if (formatLocalDateKey(start) !== formatLocalDateKey(end)) return `${date(start)} ${time(start)} – ${date(end)} ${time(end)}`;
  const range = `${time(start)}–${time(end)}`;
  return formatLocalDateKey(start) === formatLocalDateKey(today) ? range : `${date(start)} · ${range}`;
}
