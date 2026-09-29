import type { PomodoroSessionRecord } from "../types/pomodoro";

export interface PomodoroReportRange { startDate: string; endDate: string }
export interface PomodoroReportFilters { project: string; task: string }
export type PomodoroReportPreset = "today" | "week" | "month";
const DAY_MS = 86_400_000;

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function presetReportRange(preset: PomodoroReportPreset, now = new Date()): PomodoroReportRange {
  const start = new Date(now);
  const end = new Date(now);
  if (preset === "week") {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else if (preset === "month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  return { startDate: localDateKey(start), endDate: localDateKey(end) };
}

export function reportRangeBounds(range: PomodoroReportRange) {
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(range.endDate) ||
    !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
    localDateKey(start) !== range.startDate || localDateKey(end) !== range.endDate) {
    throw new Error("Hãy chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
  }
  if (end < start) throw new Error("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
  end.setDate(end.getDate() + 1);
  if (end.getTime() - start.getTime() > 93 * DAY_MS) throw new Error("Mỗi báo cáo hỗ trợ tối đa 93 ngày.");
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function sessionProjectKey(session: PomodoroSessionRecord) {
  return session.projectId || "personal";
}

export function sessionTaskKey(session: PomodoroSessionRecord) {
  if (session.eventId) return `event:${session.eventId}`;
  if (session.taskId) return `task:${session.taskId}`;
  return session.taskTitle ? `title:${session.taskTitle}` : "free";
}

export function reportFilterOptions(sessions: PomodoroSessionRecord[], project = "") {
  const projects = new Map<string, string>();
  const tasks = new Map<string, string>();
  for (const session of sessions) {
    const projectKey = sessionProjectKey(session);
    projects.set(projectKey, session.projectId ? session.projectName || "Dự án không còn tên" : "Cá nhân / tự do");
    if (!project || projectKey === project) {
      tasks.set(sessionTaskKey(session), session.taskTitle || "Phiên không gắn task");
    }
  }
  return { projects: [...projects], tasks: [...tasks] };
}

export function buildPomodoroReport(
  sessions: PomodoroSessionRecord[], range: PomodoroReportRange, filters: PomodoroReportFilters,
) {
  const { startAt, endAt } = reportRangeBounds(range);
  const selected = sessions.filter((session) => {
    const startedAt = Date.parse(session.startedAt);
    return startedAt >= Date.parse(startAt) && startedAt < Date.parse(endAt) &&
      (!filters.project || sessionProjectKey(session) === filters.project) &&
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
  return hours > 0 ? `${hours} giờ ${minutes} phút ${remainder} giây` : `${minutes} phút ${remainder} giây`;
}

export function createReportExport(
  report: ReturnType<typeof buildPomodoroReport>, range: PomodoroReportRange, filters: PomodoroReportFilters,
) {
  return {
    exportedAt: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    range: { ...range, ...reportRangeBounds(range) },
    filters, ...report,
  };
}
