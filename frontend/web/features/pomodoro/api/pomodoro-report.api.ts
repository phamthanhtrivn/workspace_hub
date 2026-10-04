import { listCalendarPomodoroSessions } from "@/features/calendar/api/calendar.api";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { reportRangeBounds, type PomodoroReportRange } from "../utils/pomodoro-report";

export async function getPomodoroReportSessions(range: PomodoroReportRange, signal?: AbortSignal): Promise<PomodoroSessionRecord[]> {
  const bounds = reportRangeBounds(range);
  const sessions = new Map<string, PomodoroSessionRecord>();
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listCalendarPomodoroSessions({ ...bounds, page, limit: 1000 }, signal);
    for (const session of result.sessions) {
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
