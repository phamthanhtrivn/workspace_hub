export type PomodoroMode = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";

export type PomodoroStatus = "IDLE" | "RUNNING" | "PAUSED";

export type PomodoroSessionStatus = "COMPLETED" | "STOPPED" | "SKIPPED";

export type PomodoroTaskAction = "COMPLETE" | "REVIEW";

export interface PomodoroConfig {
  id?: string;
  focusDuration: number; // in minutes
  shortBreak: number; // in minutes
  longBreak: number; // in minutes
  longBreakInterval: number; // number of focus sessions before long break
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  soundType: "chime" | "bell" | "digital";
  soundVolume: number; // 0.0 to 1.0
  notificationEnabled: boolean;
  dailyGoalPomodoros: number;
}

export interface PomodoroTaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface PomodoroActiveTask {
  id: string;
  calendarEventId?: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  projectStatus?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimatedPomodoros?: number;
  completedPomodoros?: number;
  checklists?: PomodoroTaskChecklistItem[];
}

export interface PomodoroSessionRecord {
  id: string;
  eventId?: string;
  userId?: string;
  taskId?: string;
  taskTitle?: string;
  projectId?: string;
  projectName?: string;
  sessionType: PomodoroMode;
  status: PomodoroSessionStatus;
  startedAt: string; // ISO string
  endedAt: string; // ISO string
  durationMinutes: number;
  actualSeconds: number;
  notes?: string;
}

export interface PomodoroDailyStats {
  date: string; // YYYY-MM-DD
  totalFocusMinutes: number;
  completedPomodoros: number;
  completedTasks: number;
  dailyGoalPomodoros: number;
  currentStreak: number;
}
