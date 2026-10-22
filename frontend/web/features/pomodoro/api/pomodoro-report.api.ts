import { listCalendarPomodoroSessions } from "@/features/calendar/api/calendar.api";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { reportRequestBounds, type PomodoroReportRange } from "../utils/pomodoro-report";

export async function getPomodoroReportSessions(range: PomodoroReportRange, signal?: AbortSignal): Promise<PomodoroSessionRecord[]> {
  // Capture once so pagination cannot expand into a different reporting window.
  const bounds = reportRequestBounds(range);
  if (bounds.startAt === bounds.endAt) return [];
  const sessions = new Map<string, PomodoroSessionRecord>();
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listCalendarPomodoroSessions({ ...bounds, page, limit: 1000 }, signal);
    for (const session of result.sessions) {
      const startedAt = Date.parse(session.startedAt);
      if (!(startedAt >= Date.parse(bounds.startAt) && startedAt < Date.parse(bounds.endAt))) continue;
      sessions.set(session.id, {
        ...session,
        eventId: session.eventId ?? undefined,
        taskId: session.taskId ?? undefined,
        taskTitle: session.taskTitle ?? undefined,
        projectId: session.projectId ?? undefined,
        projectName: session.projectName ?? undefined,
        notes: session.notes ?? undefined,
      });
    }
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return [...sessions.values()];
}
