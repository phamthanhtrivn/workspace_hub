import {
  createCalendarPomodoroSession,
  getCalendarPomodoroConfig,
  getCalendarPomodoroDailyStats,
  getTodayCalendarPomodoroSessions,
  saveCalendarPomodoroConfig,
} from "@/features/calendar/api/calendar.api";
import type {
  PomodoroConfig,
  PomodoroDailyStats,
  PomodoroSessionRecord,
} from "../types/pomodoro";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 2,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundType: "chime",
  soundVolume: 0.7,
  notificationEnabled: true,
  dailyGoalPomodoros: 8,
};

export async function getPomodoroConfig(): Promise<PomodoroConfig> {
  return getCalendarPomodoroConfig();
}

export async function savePomodoroConfig(config: PomodoroConfig): Promise<PomodoroConfig> {
  return saveCalendarPomodoroConfig({
    focusDuration: config.focusDuration,
    shortBreak: config.shortBreak,
    longBreak: config.longBreak,
    longBreakInterval: config.longBreakInterval,
    autoStartBreak: config.autoStartBreak,
    autoStartFocus: config.autoStartFocus,
    soundEnabled: config.soundEnabled,
    soundType: config.soundType,
    soundVolume: config.soundVolume,
    notificationEnabled: config.notificationEnabled,
    dailyGoalPomodoros: config.dailyGoalPomodoros,
  });
}

export async function recordPomodoroSession(
  session: Omit<PomodoroSessionRecord, "id">,
): Promise<PomodoroSessionRecord> {
  const result = await createCalendarPomodoroSession({
    clientSessionId: `pomodoro:${session.sessionType}:${session.status}:${session.startedAt}`,
    eventId: session.eventId,
    taskId: session.taskId && UUID.test(session.taskId) ? session.taskId : undefined,
    taskTitle: session.taskTitle,
    projectId: session.projectId && UUID.test(session.projectId) ? session.projectId : undefined,
    projectName: session.projectName,
    sessionType: session.sessionType,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    plannedSeconds: session.status === "COMPLETED"
      ? session.actualSeconds
      : Math.max(1, session.durationMinutes * 60),
    actualSeconds: session.actualSeconds,
    notes: session.notes,
  });
  return {
    ...result,
    startedAt: String(result.startedAt),
    endedAt: String(result.endedAt),
    eventId: result.eventId ?? undefined,
    taskId: result.taskId ?? undefined,
    taskTitle: result.taskTitle ?? undefined,
    projectId: result.projectId ?? undefined,
    projectName: result.projectName ?? undefined,
    notes: result.notes ?? undefined,
  };
}

export async function getRecentSessions(): Promise<PomodoroSessionRecord[]> {
  const sessions = await getTodayCalendarPomodoroSessions();
  return sessions.map((session) => ({
    ...session,
    startedAt: String(session.startedAt),
    endedAt: String(session.endedAt),
    eventId: session.eventId ?? undefined,
    taskId: session.taskId ?? undefined,
    taskTitle: session.taskTitle ?? undefined,
    projectId: session.projectId ?? undefined,
    projectName: session.projectName ?? undefined,
    notes: session.notes ?? undefined,
  }));
}

export async function getDailyStats(): Promise<PomodoroDailyStats> {
  return getCalendarPomodoroDailyStats();
}
