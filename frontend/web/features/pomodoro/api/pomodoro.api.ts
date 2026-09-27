import { api } from "@/lib/axios";
import type {
  PomodoroConfig,
  PomodoroDailyStats,
  PomodoroSessionRecord,
} from "../types/pomodoro";

const LOCAL_CONFIG_KEY = "workspace_hub_pomodoro_config";
const LOCAL_SESSIONS_KEY = "workspace_hub_pomodoro_sessions";

// When true, operates purely in client-side storage mode to prevent 502 Bad Gateway
// error logs when developing UI without backend services running.
const UI_ONLY_MODE = true;

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundType: "chime",
  soundVolume: 0.7,
  notificationEnabled: true,
  dailyGoalPomodoros: 8,
};

// -------------------------------------------------------------
// Configuration API
// -------------------------------------------------------------
export async function getPomodoroConfig(): Promise<PomodoroConfig> {
  if (UI_ONLY_MODE) {
    return getLocalConfig();
  }

  try {
    const res = await api.get<{ success: boolean; data: PomodoroConfig }>(
      "/api/pomodoros/config",
    );
    if (res.data?.success && res.data?.data) {
      saveLocalConfig(res.data.data);
      return res.data.data;
    }
  } catch {
    // Graceful fallback to client storage
  }
  return getLocalConfig();
}

export async function savePomodoroConfig(
  config: PomodoroConfig,
): Promise<PomodoroConfig> {
  saveLocalConfig(config);

  if (UI_ONLY_MODE) {
    return config;
  }

  try {
    const res = await api.put<{ success: boolean; data: PomodoroConfig }>(
      "/api/pomodoros/config",
      config,
    );
    if (res.data?.success && res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Saved locally, server sync can occur later
  }
  return config;
}

// -------------------------------------------------------------
// Session API
// -------------------------------------------------------------
export async function recordPomodoroSession(
  session: Omit<PomodoroSessionRecord, "id">,
): Promise<PomodoroSessionRecord> {
  const newSession: PomodoroSessionRecord = {
    ...session,
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };

  saveLocalSession(newSession);

  if (UI_ONLY_MODE) {
    return newSession;
  }

  try {
    const res = await api.post<{
      success: boolean;
      data: PomodoroSessionRecord;
    }>("/api/pomodoros/sessions", newSession);
    if (res.data?.success && res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Return the locally created session
  }

  return newSession;
}

export async function getRecentSessions(): Promise<PomodoroSessionRecord[]> {
  if (UI_ONLY_MODE) {
    return getLocalSessions();
  }

  try {
    const res = await api.get<{
      success: boolean;
      data: PomodoroSessionRecord[];
    }>("/api/pomodoros/sessions/today");
    if (res.data?.success && Array.isArray(res.data?.data)) {
      return res.data.data;
    }
  } catch {
    // Fallback to local
  }
  return getLocalSessions();
}

export async function getDailyStats(): Promise<PomodoroDailyStats> {
  const todayStr = new Date().toISOString().split("T")[0];
  const sessions = getLocalSessions().filter(
    (s) => s.startedAt.split("T")[0] === todayStr,
  );

  const completedFocus = sessions.filter(
    (s) => s.sessionType === "FOCUS" && s.status === "COMPLETED",
  );

  const totalFocusSeconds = sessions
    .filter((s) => s.sessionType === "FOCUS")
    .reduce((acc, curr) => acc + (curr.actualSeconds || 0), 0);

  const interruptions: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.interruptionReason) {
      interruptions[s.interruptionReason] =
        (interruptions[s.interruptionReason] || 0) + 1;
    }
  });

  const config = getLocalConfig();

  return {
    date: todayStr,
    totalFocusMinutes: Math.round(totalFocusSeconds / 60),
    completedPomodoros: completedFocus.length,
    completedTasks: new Set(
      completedFocus.filter((s) => s.taskId).map((s) => s.taskId),
    ).size,
    dailyGoalPomodoros: config.dailyGoalPomodoros || 8,
    currentStreak: calculateStreak(getLocalSessions()),
    interruptionCounts: interruptions,
  };
}

// -------------------------------------------------------------
// Local Storage Helpers
// -------------------------------------------------------------
function getLocalConfig(): PomodoroConfig {
  if (typeof window === "undefined") return DEFAULT_POMODORO_CONFIG;
  try {
    const saved = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (saved) return { ...DEFAULT_POMODORO_CONFIG, ...JSON.parse(saved) };
  } catch {
    // ignore
  }
  return DEFAULT_POMODORO_CONFIG;
}

function saveLocalConfig(config: PomodoroConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function getLocalSessions(): PomodoroSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Seed default sample sessions for UI demonstration on first load
    const now = Date.now();
    const seeded: PomodoroSessionRecord[] = [
      {
        id: "seed-session-1",
        sessionType: "FOCUS",
        status: "COMPLETED",
        startedAt: new Date(now - 60 * 60 * 1000).toISOString(),
        endedAt: new Date(now - 35 * 60 * 1000).toISOString(),
        durationMinutes: 25,
        actualSeconds: 25 * 60,
        taskTitle: "Thiết kế & Tối ưu giao diện Pomodoro Focus Hub",
        projectName: "Khóa luận tốt nghiệp (KLTN)",
        notes: "Hoàn thiện audio player và inline task creator",
      },
      {
        id: "seed-session-2",
        sessionType: "SHORT_BREAK",
        status: "COMPLETED",
        startedAt: new Date(now - 35 * 60 * 1000).toISOString(),
        endedAt: new Date(now - 30 * 60 * 1000).toISOString(),
        durationMinutes: 5,
        actualSeconds: 5 * 60,
      },
    ];
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    // ignore
  }
  return [];
}

function saveLocalSession(session: PomodoroSessionRecord) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalSessions();
    const updated = [session, ...existing.slice(0, 100)];
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function calculateStreak(sessions: PomodoroSessionRecord[]): number {
  if (!sessions.length) return 1;
  const daysWithCompleted = new Set(
    sessions
      .filter((s) => s.sessionType === "FOCUS" && s.status === "COMPLETED")
      .map((s) => s.startedAt.split("T")[0]),
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (daysWithCompleted.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return Math.max(1, streak);
}
