import type { PomodoroSessionRecord } from "../types/pomodoro";
import { POMODORO_REPORT_COPY as copy, POMODORO_REPORT_MAX_DAYS, POMODORO_REPORT_SOURCES } from "../constants/pomodoro-report";

export interface PomodoroReportRange { startDate: string; endDate: string }
export type PomodoroReportSource = (typeof POMODORO_REPORT_SOURCES)[number]["value"];
export interface PomodoroReportFilters { source: PomodoroReportSource; project: string; task: string }
export type PomodoroReportPreset = "today" | "week" | "month";
export type PomodoroReportRangeErrors = Partial<Record<keyof PomodoroReportRange, string>>;
const DAY_MS = 86_400_000;

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function presetReportRange(preset: PomodoroReportPreset, now = new Date()): PomodoroReportRange {
  const start = new Date(now);
  const end = new Date(now);
  if (preset === "week") {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  } else if (preset === "month") {
    start.setDate(1);
  }
  return { startDate: localDateKey(start), endDate: localDateKey(end) };
}

export function reportRangeErrors(range: PomodoroReportRange, now = new Date()): PomodoroReportRangeErrors {
  const errors: PomodoroReportRangeErrors = {};
  const today = localDateKey(now);
  for (const field of ["startDate", "endDate"] as const) {
    const value = range[field];
    const date = new Date(`${value}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || localDateKey(date) !== value) {
      errors[field] = copy.invalidDate;
    } else if (value > today) errors[field] = copy.futureDate;
  }
  if (Object.keys(errors).length) return errors;
  if (range.endDate < range.startDate) return { endDate: copy.reversedDates };
  const end = new Date(`${range.endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  if (end.getTime() - new Date(`${range.startDate}T00:00:00`).getTime() > POMODORO_REPORT_MAX_DAYS * DAY_MS) {
    errors.endDate = copy.rangeTooLong;
  }
  return errors;
}

// Full local-day bounds also drive daily buckets; request bounds use a separate cutoff.
export function reportRangeBounds(range: PomodoroReportRange, now = new Date()) {
  const errors = reportRangeErrors(range, now);
  const error = errors.startDate || errors.endDate;
  if (error) throw new Error(error);
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function reportRequestBounds(range: PomodoroReportRange, now = new Date()) {
  const bounds = reportRangeBounds(range, now);
  return { ...bounds, endAt: new Date(Math.min(Date.parse(bounds.endAt), now.getTime())).toISOString() };
}

export function sameReportRange(left: PomodoroReportRange, right: PomodoroReportRange) {
  return left.startDate === right.startDate && left.endDate === right.endDate;
}

export function formatReportRange(range: PomodoroReportRange) {
  const format = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString();
  return `${format(range.startDate)} – ${format(range.endDate)}`;
}

function matchesReportSource(session: PomodoroSessionRecord, source: PomodoroReportSource) {
  return source === "all" || (source === "project" ? Boolean(session.projectId) : !session.projectId);
}

export function sessionTaskKey(session: PomodoroSessionRecord) {
  if (session.eventId) return `event:${session.eventId}`;
  if (session.taskId) return `task:${session.taskId}`;
  return session.taskTitle ? `title:${session.taskTitle}` : "free";
}

export function reportFilterOptions(sessions: PomodoroSessionRecord[], filters: Pick<PomodoroReportFilters, "source" | "project">) {
  const projects = new Map<string, string>();
  const tasks = new Map<string, string>();
  for (const session of sessions) {
    if (!matchesReportSource(session, filters.source)) continue;
    if (session.projectId) projects.set(session.projectId, session.projectName || "Unnamed project");
    if (!filters.project || session.projectId === filters.project) {
      tasks.set(sessionTaskKey(session), session.taskTitle || "Session without a task");
    }
  }
  return { projects: [...projects], tasks: [...tasks] };
}

export function reconcileReportFilters(sessions: PomodoroSessionRecord[], filters: PomodoroReportFilters) {
  const options = reportFilterOptions(sessions, filters);
  if (filters.project && !options.projects.some(([key]) => key === filters.project)) {
    return { filters: { ...filters, project: "", task: "" }, notice: copy.projectReset };
  }
  if (filters.task && !options.tasks.some(([key]) => key === filters.task)) {
    return { filters: { ...filters, task: "" }, notice: copy.taskReset };
  }
  return { filters, notice: "" };
}

export function buildPomodoroReport(
  sessions: PomodoroSessionRecord[], range: PomodoroReportRange, filters: PomodoroReportFilters, now = new Date(),
) {
  const { startAt, endAt } = reportRangeBounds(range, now);
  const cutoff = Math.min(Date.parse(endAt), now.getTime());
  const selected = sessions.filter((session) => {
    const startedAt = Date.parse(session.startedAt);
    return startedAt >= Date.parse(startAt) && startedAt < cutoff &&
      matchesReportSource(session, filters.source) &&
      (!filters.project || session.projectId === filters.project) &&
      (!filters.task || sessionTaskKey(session) === filters.task);
  }).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id.localeCompare(a.id));
  const days = new Map<string, { date: string; focusSeconds: number; completedFocusSessions: number; totalSessions: number }>();
  for (const day = new Date(startAt); day < new Date(endAt); day.setDate(day.getDate() + 1)) {
    const date = localDateKey(day);
    days.set(date, { date, focusSeconds: 0, completedFocusSessions: 0, totalSessions: 0 });
  }
  let stoppedFocusSessions = 0;
  let skippedFocusSessions = 0;
  for (const session of selected) {
    const day = days.get(localDateKey(new Date(session.startedAt)))!;
    day.totalSessions += 1;
    if (session.sessionType !== "FOCUS") continue;
    day.focusSeconds += session.actualSeconds;
    if (session.status === "COMPLETED") day.completedFocusSessions += 1;
    if (session.status === "STOPPED") stoppedFocusSessions += 1;
    if (session.status === "SKIPPED") skippedFocusSessions += 1;
  }
  const daily = [...days.values()];
  return {
    sessions: selected,
    summary: {
      totalSessions: selected.length,
      focusSeconds: daily.reduce((total, day) => total + day.focusSeconds, 0),
      completedFocusSessions: daily.reduce((total, day) => total + day.completedFocusSessions, 0),
      stoppedFocusSessions, skippedFocusSessions,
    },
    daily,
  };
}

export function formatFocusTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  return hours > 0 ? `${hours}h ${minutes}m ${remainder}s` : `${minutes}m ${remainder}s`;
}

export function getPomodoroReportDays(days: ReturnType<typeof buildPomodoroReport>["daily"], hideEmpty: boolean) {
  return hideEmpty ? days.filter(day => day.totalSessions > 0) : days;
}
