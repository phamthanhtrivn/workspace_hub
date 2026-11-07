import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";

export function presentPomodoroSession(session: PomodoroSessionRecord, timeZone?: string) {
  const start = new Date(session.startedAt);
  const end = session.endedAt ? new Date(session.endedAt) : null;
  const dateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone };
  const date = start.toLocaleDateString(POMODORO_DISPLAY_LOCALE, dateOptions);
  const startTime = start.toLocaleTimeString(POMODORO_DISPLAY_LOCALE, timeOptions);
  const endTime = end?.toLocaleTimeString(POMODORO_DISPLAY_LOCALE, timeOptions) ?? "--:--";
  const isFocus = session.sessionType === "FOCUS";

  return {
    isFocus, date, startTime, endTime,
    title: session.taskTitle || (isFocus ? copy.freeFocus : copy.break),
    typeLabel: copy.sessionTypes[session.sessionType],
    sourceLabel: session.projectId ? copy.sessionSources.project : session.eventId ? copy.sessionSources.calendar : copy.sessionSources.free,
    hasNotes: Boolean(session.notes?.trim()),
    startedAt: `${date}, ${startTime}`,
    endedAt: end ? `${end.toLocaleDateString(POMODORO_DISPLAY_LOCALE, dateOptions)}, ${endTime}` : "--",
  };
}
