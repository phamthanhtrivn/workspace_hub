"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PomodoroActiveTask,
  PomodoroConfig,
  PomodoroMode,
  PomodoroSessionStatus,
  PomodoroStatus,
} from "../types/pomodoro";
import {
  DEFAULT_POMODORO_CONFIG,
  getPomodoroConfig,
  recordPomodoroSession,
  savePomodoroConfig,
} from "../api/pomodoro-server.api";
import { getCalendarPomodoroTimerState, saveCalendarPomodoroTimerState } from "@/features/calendar/api/calendar.api";
import { toast } from "sonner";
import { playPomodoroSound } from "../utils/sound";
import { getNextPomodoroCycleStep } from "../utils/pomodoro-cycle";
import {
  loadLocalPomodoroConfig,
  loadPendingPomodoroConfig,
  loadLocalPomodoroTimerState,
  saveLocalPomodoroConfig,
  saveLocalPomodoroTimerState,
} from "../utils/pomodoro-local-storage";
import { usePomodoroAmbient } from "./use-pomodoro-ambient";
import { limitPomodoroNotes } from "../utils/pomodoro-notes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PendingTimerState = Omit<Parameters<typeof saveCalendarPomodoroTimerState>[0], "expectedVersion">;

function toPendingTimerState(state: Parameters<typeof saveLocalPomodoroTimerState>[1]): PendingTimerState {
  return {
    plannedSeconds: state.plannedSeconds,
    mode: state.mode,
    status: state.status,
    targetEndAt: state.targetEndAt,
    remainingSeconds: state.remainingSeconds,
    cycleCount: state.cycleCount,
    sessionStartAt: state.sessionStartAt,
    eventId: state.eventId,
    taskId: state.taskId,
    activeTask: state.activeTask,
    notes: limitPomodoroNotes(state.notes),
  };
}

function getDurationForMode(
  targetMode: PomodoroMode,
  cfg: PomodoroConfig,
): number {
  switch (targetMode) {
    case "FOCUS":
      return (cfg.focusDuration ?? 25) * 60;
    case "SHORT_BREAK":
      return (cfg.shortBreak ?? 5) * 60;
    case "LONG_BREAK":
      return (cfg.longBreak ?? 15) * 60;
  }
}

export function usePomodoroTimer(userId: string) {
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [mode, setMode] = useState<PomodoroMode>("FOCUS");
  const [status, setStatus] = useState<PomodoroStatus>("IDLE");
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [isTaskActionPending, setIsTaskActionPending] = useState(false);
  const taskActionInProgressRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [totalDuration, setTotalDurationState] = useState<number>(25 * 60);
  const totalDurationRef = useRef(totalDuration);
  const setTotalDuration = useCallback((seconds: number) => {
    totalDurationRef.current = seconds;
    setTotalDurationState(seconds);
  }, []);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [activeTask, setActiveTask] = useState<PomodoroActiveTask | null>(null);
  const [notes, setNotes] = useState<string>("");

  const {
    ambientTrack,
    ambientVolume,
    autoPlayAmbient,
    isAmbientPlaying,
    customTracks,
    playAmbient,
    pauseAmbient,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    uploadCustomTrack,
    removeCustomTrack,
  } = usePomodoroAmbient(status, userId);

  const targetEndTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const initialTitleRef = useRef<string>("");
  const isHydratedRef = useRef<boolean>(false);
  const stateVersionRef = useRef(0);
  const pendingStateRef = useRef<PendingTimerState | null>(null);
  const stateSaveInFlightRef = useRef(false);
  const refreshVersionBeforeRetryRef = useRef(false);
  const stateSyncErrorShownRef = useRef(false);
  const stateSyncFailedRef = useRef(false);
  const configSyncFailedRef = useRef(false);
  const pendingConfigRef = useRef<PomodoroConfig | null>(null);
  const configSaveInFlightRef = useRef(false);
  const completionInProgressRef = useRef(false);
  const lastCompletionAttemptRef = useRef(0);
  const lastQueuedStateRef = useRef("");
  const timeLeftRef = useRef(timeLeft);
  const mountedRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Load server-backed config and timer state on mount.
  useEffect(() => {
    mountedRef.current = true;
    if (typeof document !== "undefined") {
      initialTitleRef.current = document.title || "WorkSpaceHub";
    }

    let mounted = true;
    const localConfig = loadLocalPomodoroConfig(userId);
    const pendingLocalConfig = loadPendingPomodoroConfig(userId);
    const localTimerState = loadLocalPomodoroTimerState(userId);

    void Promise.allSettled([getPomodoroConfig(), getCalendarPomodoroTimerState()])
      .then(([configResult, timerStateResult]) => {
        if (!mounted) return;
        const cfg = pendingLocalConfig ?? (configResult.status === "fulfilled"
          ? configResult.value
          : localConfig ?? DEFAULT_POMODORO_CONFIG);
        const serverState = timerStateResult.status === "fulfilled"
          ? timerStateResult.value
          : null;
        const saved = serverState && localTimerState
          ? Date.parse(localTimerState.updatedAt) > Date.parse(serverState.updatedAt)
            ? localTimerState
            : serverState
          : serverState ?? localTimerState;
        configSyncFailedRef.current = configResult.status === "rejected" || Boolean(pendingLocalConfig);
        stateSyncFailedRef.current = timerStateResult.status === "rejected";
        const hasServerError = configSyncFailedRef.current || stateSyncFailedRef.current;

        if (pendingLocalConfig) pendingConfigRef.current = pendingLocalConfig;
        else if (configResult.status === "fulfilled") saveLocalPomodoroConfig(userId, cfg);
        else if (localConfig) pendingConfigRef.current = localConfig;
        if (saved) saveLocalPomodoroTimerState(userId, saved);
        if (saved && saved === localTimerState && saved !== serverState) {
          pendingStateRef.current = toPendingTimerState(saved);
        }
        setConfig(cfg);
        stateVersionRef.current = saved?.version ?? 0;
        if (saved) {
          const restoredMode = saved.mode as PomodoroMode;
          const duration = saved.plannedSeconds ?? getDurationForMode(restoredMode, cfg);
          setMode(restoredMode);
          setCycleCount(saved.cycleCount);
          setActiveTask(saved.activeTask as unknown as PomodoroActiveTask | null);
          setNotes(limitPomodoroNotes(saved.notes));
          setTotalDuration(duration);
          sessionStartTimeRef.current = saved.sessionStartAt ? new Date(saved.sessionStartAt).getTime() : null;
          const target = saved.targetEndAt ? new Date(saved.targetEndAt).getTime() : null;
          const remaining = target ? Math.max(0, Math.round((target - Date.now()) / 1000)) : saved.remainingSeconds;
          // Keep expired running sessions active so the tick loop records completion.
          targetEndTimeRef.current = saved.status === "RUNNING" ? target : null;
          setTimeLeft(saved.status === "IDLE" ? saved.remainingSeconds || duration : remaining);
          setStatus(saved.status);
        } else {
          setTimeLeft(getDurationForMode("FOCUS", cfg));
          setTotalDuration(getDurationForMode("FOCUS", cfg));
        }
        isHydratedRef.current = true;
        setLoadError(hasServerError);
        setIsReady(true);
        if (hasServerError) {
          toast.error("Không kết nối được máy chủ. Pomodoro đang dùng dữ liệu cục bộ.");
        }
      });
    return () => {
      mounted = false;
      mountedRef.current = false;
      document.title = initialTitleRef.current;
      isHydratedRef.current = false;
      pendingStateRef.current = null;
      pendingConfigRef.current = null;
    };
  }, [userId, setTotalDuration]);

  const flushPendingConfig = useCallback(async () => {
    if (!mountedRef.current || configSaveInFlightRef.current || !pendingConfigRef.current) return;
    configSaveInFlightRef.current = true;
    let failedConfig: PomodoroConfig | null = null;
    try {
      while (mountedRef.current && pendingConfigRef.current) {
        const pendingConfig = pendingConfigRef.current;
        failedConfig = pendingConfig;
        pendingConfigRef.current = null;
        await savePomodoroConfig(pendingConfig);
        if (!mountedRef.current) return;
        saveLocalPomodoroConfig(userId, pendingConfig);
        failedConfig = null;
      }
      configSyncFailedRef.current = false;
      setLoadError(stateSyncFailedRef.current);
    } catch {
      if (!pendingConfigRef.current && failedConfig) {
        pendingConfigRef.current = failedConfig;
      }
      configSyncFailedRef.current = true;
      setLoadError(true);
    } finally {
      configSaveInFlightRef.current = false;
    }
  }, [userId]);

  // Keep one write in flight and replace queued changes with the latest state.
  const flushPendingState = useCallback(async () => {
    if (!mountedRef.current || stateSaveInFlightRef.current) return;
    stateSaveInFlightRef.current = true;
    let failedSnapshot: PendingTimerState | null = null;
    try {
      if (refreshVersionBeforeRetryRef.current) {
        const remoteState = await getCalendarPomodoroTimerState();
        if (!mountedRef.current) return;
        stateVersionRef.current = remoteState?.version ?? 0;
        refreshVersionBeforeRetryRef.current = false;
      }
      while (pendingStateRef.current && isHydratedRef.current) {
        const snapshot = pendingStateRef.current;
        failedSnapshot = snapshot;
        pendingStateRef.current = null;
        const saved = await saveCalendarPomodoroTimerState({
          ...snapshot,
          expectedVersion: stateVersionRef.current,
        });
        if (!mountedRef.current) return;
        stateVersionRef.current = saved.version;
        if (!pendingStateRef.current) {
          saveLocalPomodoroTimerState(userId, {
            ...snapshot,
            version: saved.version,
            updatedAt: saved.updatedAt ?? new Date().toISOString(),
          });
        }
        failedSnapshot = null;
      }
      stateSyncFailedRef.current = false;
      setLoadError(configSyncFailedRef.current);
      stateSyncErrorShownRef.current = false;
    } catch {
      if (!pendingStateRef.current && failedSnapshot) {
        pendingStateRef.current = failedSnapshot;
      }
      refreshVersionBeforeRetryRef.current = true;
      stateSyncFailedRef.current = true;
      setLoadError(true);
      if (!stateSyncErrorShownRef.current) {
        stateSyncErrorShownRef.current = true;
        toast.error("Chưa đồng bộ được Pomodoro. Timer vẫn chạy và sẽ tự thử lại.");
      }
    } finally {
      stateSaveInFlightRef.current = false;
    }
  }, [userId]);

  const persistState = useCallback(
    (
      newMode: PomodoroMode,
      newStatus: PomodoroStatus,
      targetEnd: number | null,
      remainingSec: number,
      cycle: number,
      task: PomodoroActiveTask | null,
      noteText: string,
    ) => {
      if (!isHydratedRef.current) return;
      const sessionStart = sessionStartTimeRef.current;
      const snapshot = {
        plannedSeconds: totalDurationRef.current,
        mode: newMode,
        status: newStatus,
        targetEndAt: targetEnd ? new Date(targetEnd).toISOString() : null,
        remainingSeconds: remainingSec,
        cycleCount: cycle,
        sessionStartAt: sessionStart ? new Date(sessionStart).toISOString() : null,
        taskId: task?.id && UUID.test(task.id) ? task.id : null,
        activeTask: task as unknown as Record<string, unknown> | null,
        notes: limitPomodoroNotes(noteText),
        eventId: task?.calendarEventId ?? null,
      };
      const signature = JSON.stringify(snapshot);
      if (signature === lastQueuedStateRef.current) return;
      lastQueuedStateRef.current = signature;
      saveLocalPomodoroTimerState(userId, {
        ...snapshot,
        version: stateVersionRef.current,
        updatedAt: new Date().toISOString(),
      });
      pendingStateRef.current = snapshot;
      void flushPendingState();
    },
    [flushPendingState, userId],
  );

  useEffect(() => {
    if (isHydratedRef.current) {
      persistState(mode, status, targetEndTimeRef.current, timeLeftRef.current, cycleCount, activeTask, notes);
    }
  }, [activeTask, notes, mode, status, cycleCount, persistState]);

  useEffect(() => {
    if (!isReady || !loadError) return;
    let active = true;

    const retrySynchronization = async () => {
      if (pendingConfigRef.current) {
        await flushPendingConfig();
      } else if (configSyncFailedRef.current) {
        try {
          const serverConfig = await getPomodoroConfig();
          if (!active || pendingConfigRef.current) return;
          setConfig(serverConfig);
          saveLocalPomodoroConfig(userId, serverConfig);
          configSyncFailedRef.current = false;
        } catch {
          configSyncFailedRef.current = true;
        }
      }

      if (pendingStateRef.current) {
        await flushPendingState();
      } else if (stateSyncFailedRef.current) {
        try {
          const serverState = await getCalendarPomodoroTimerState();
          if (!active) return;
          stateVersionRef.current = serverState?.version ?? 0;
          stateSyncFailedRef.current = false;
        } catch {
          stateSyncFailedRef.current = true;
        }
      }

      if (active) {
        setLoadError(configSyncFailedRef.current || stateSyncFailedRef.current);
      }
    };

    const interval = setInterval(() => void retrySynchronization(), 5_000);
    const retryWhenOnline = () => void retrySynchronization();
    window.addEventListener("online", retryWhenOnline);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [flushPendingConfig, flushPendingState, isReady, loadError, userId]);

  // Notification trigger
  const sendBrowserNotification = useCallback(
    (title: string, body: string) => {
      if (!config.notificationEnabled || typeof window === "undefined") return;

      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
            });
          } catch {
            // ignore
          }
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    },
    [config.notificationEnabled],
  );

  // Handle session completion
  const handleSessionComplete = useCallback(async () => {
    const now = Date.now();
    if (taskActionInProgressRef.current || completionInProgressRef.current || now - lastCompletionAttemptRef.current < 15_000) return;
    completionInProgressRef.current = true;
    lastCompletionAttemptRef.current = now;
    // Stop ambient sound during alert & break transition
    pauseAmbient();

    // Save the session before leaving its expired running state.
    const startedAt = sessionStartTimeRef.current
      ? new Date(sessionStartTimeRef.current).toISOString()
      : new Date(Date.now() - totalDuration * 1000).toISOString();
    const endedAt = new Date().toISOString();

    try {
      await recordPomodoroSession({
      eventId: activeTask?.calendarEventId,
      taskId: activeTask?.id,
      taskTitle: activeTask?.title,
      projectId: activeTask?.projectId,
      projectName: activeTask?.projectName,
      sessionType: mode,
      status: "COMPLETED",
      startedAt,
      endedAt,
      durationMinutes: Math.round(totalDuration / 60),
      actualSeconds: totalDuration,
      notes: notes.trim() || undefined,
      });
      if (!mountedRef.current) return;
      setSessionRevision((revision) => revision + 1);
      if (mode === "FOCUS" && activeTask) {
        setActiveTask((current) => current?.id === activeTask.id
          ? { ...current, completedPomodoros: (current.completedPomodoros || 0) + 1 }
          : current);
      }
    } catch {
      completionInProgressRef.current = false;
      toast.error("Không lưu được phiên Pomodoro. Hệ thống sẽ thử lại.");
      return;
    }

    if (config.soundEnabled) {
      playPomodoroSound(config.soundType, config.soundVolume);
    }
    const modeLabel = mode === "FOCUS" ? "Phiên tập trung" : "Thời gian nghỉ ngơi";
    sendBrowserNotification(
      `${modeLabel} đã kết thúc!`,
      mode === "FOCUS"
        ? "Tuyệt vời! Hãy cho mắt và đầu óc nghỉ ngơi một chút."
        : "Đã hết giờ giải lao. Sẵn sàng cho phiên tập trung tiếp theo?",
    );

    // 4. Determine next mode
    const nextStep = getNextPomodoroCycleStep(
      mode,
      cycleCount,
      config.longBreakInterval || 2,
    );
    const nextMode = nextStep.mode;
    const nextCycle = nextStep.cycleCount;
    setCycleCount(nextCycle);

    setMode(nextMode);
    const nextDuration = getDurationForMode(nextMode, config);
    setTotalDuration(nextDuration);
    setTimeLeft(nextDuration);

    const shouldAutoStart =
      (nextMode !== "FOCUS" && config.autoStartBreak) ||
      (nextMode === "FOCUS" && config.autoStartFocus);

    if (shouldAutoStart) {
      const now = Date.now();
      sessionStartTimeRef.current = now;
      targetEndTimeRef.current = now + nextDuration * 1000;
      setStatus("RUNNING");

      // Auto start ambient audio if starting Focus
      if (nextMode === "FOCUS" && autoPlayAmbient && ambientTrack !== "none") {
        playAmbient();
      }

      persistState(
        nextMode,
        "RUNNING",
        targetEndTimeRef.current,
        nextDuration,
        nextCycle,
        activeTask,
        notes,
      );
    } else {
      setStatus("IDLE");
      targetEndTimeRef.current = null;
      sessionStartTimeRef.current = null;
      persistState(
        nextMode,
        "IDLE",
        null,
        nextDuration,
        nextCycle,
        activeTask,
        notes,
      );
    }
    completionInProgressRef.current = false;
  }, [
    config,
    mode,
    totalDuration,
    notes,
    activeTask,
    cycleCount,
    autoPlayAmbient,
    ambientTrack,
    persistState,
    sendBrowserNotification,
    pauseAmbient,
    playAmbient,
    setTotalDuration,
  ]);

  // Main tick loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (status === "RUNNING") {
      interval = setInterval(() => {
        if (!targetEndTimeRef.current) return;

        const now = Date.now();
        const diff = Math.max(
          0,
          Math.round((targetEndTimeRef.current - now) / 1000),
        );

        setTimeLeft(diff);

        // Update Document Title with remaining time
        if (typeof document !== "undefined") {
          const m = Math.floor(diff / 60);
          const s = diff % 60;
          const timeFormatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
          const modeTag =
            mode === "FOCUS"
              ? "🎯 Focus"
              : mode === "SHORT_BREAK"
                ? "☕ Short Break"
                : "🌴 Long Break";
          document.title = `(${timeFormatted}) ${modeTag} - WorkSpaceHub`;
        }

        if (diff <= 0) {
          void handleSessionComplete();
        }
      }, 1000);
    } else {
      if (typeof document !== "undefined") {
        document.title = initialTitleRef.current || "WorkSpaceHub";
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, mode, handleSessionComplete]);

  // -----------------------------------------------------------
  // Action Handlers
  // -----------------------------------------------------------

  const start = useCallback(() => {
    if (!isHydratedRef.current || taskActionInProgressRef.current || status !== "IDLE") return;
    // Request notification permission if needed
    if (
      config.notificationEnabled &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }

    const now = Date.now();
    const duration = getDurationForMode(mode, config);
    targetEndTimeRef.current = now + duration * 1000;
    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = now;
    }

    const sessionFullDur = getDurationForMode(mode, config);
    if (!totalDuration || totalDuration <= 0 || status === "IDLE") {
      setTotalDuration(sessionFullDur);
    }

    setTimeLeft(duration);
    setStatus("RUNNING");

    // Start ambient music if Focus mode and autoPlay enabled
    if (mode === "FOCUS" && autoPlayAmbient && ambientTrack !== "none") {
      playAmbient();
    }

    persistState(
      mode,
      "RUNNING",
      targetEndTimeRef.current,
      duration,
      cycleCount,
      activeTask,
      notes,
    );
  }, [
    config,
    totalDuration,
    status,
    mode,
    cycleCount,
    activeTask,
    notes,
    autoPlayAmbient,
    ambientTrack,
    persistState,
    playAmbient,
    setTotalDuration,
  ]);

  const pause = useCallback(() => {
    if (taskActionInProgressRef.current) return;
    if (status !== "RUNNING") return;
    if (completionInProgressRef.current || (targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) return;

    const remaining = targetEndTimeRef.current !== null
      ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
      : timeLeftRef.current;
    timeLeftRef.current = remaining;
    setTimeLeft(remaining);
    setStatus("PAUSED");
    targetEndTimeRef.current = null;

    // Pause ambient sound
    pauseAmbient();

    persistState(
      mode,
      "PAUSED",
      null,
      remaining,
      cycleCount,
      activeTask,
      notes,
    );
  }, [status, mode, cycleCount, activeTask, notes, persistState, pauseAmbient]);

  const resume = useCallback(() => {
    if (taskActionInProgressRef.current) return;
    if (status !== "PAUSED") return;

    const now = Date.now();
    targetEndTimeRef.current = now + timeLeft * 1000;
    setStatus("RUNNING");

    // Resume ambient music if in Focus
    if (mode === "FOCUS" && autoPlayAmbient && ambientTrack !== "none") {
      playAmbient();
    }

    persistState(
      mode,
      "RUNNING",
      targetEndTimeRef.current,
      timeLeft,
      cycleCount,
      activeTask,
      notes,
    );
  }, [status, timeLeft, mode, cycleCount, activeTask, notes, autoPlayAmbient, ambientTrack, persistState, playAmbient]);

  const saveInterruptedSession = useCallback(async (
    sessionStatus: PomodoroSessionStatus,
    minimumSeconds: number,
  ): Promise<boolean> => {
    if (
      !isHydratedRef.current ||
      taskActionInProgressRef.current ||
      completionInProgressRef.current ||
      (status === "RUNNING" && targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())
    ) {
      return false;
    }
    pauseAmbient();
    const startedAt = sessionStartTimeRef.current;
    if (startedAt === null || status === "IDLE") return true;
    const remaining = targetEndTimeRef.current !== null
      ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
      : timeLeftRef.current;
    const actualSeconds = Math.max(0, totalDurationRef.current - remaining);
    if (actualSeconds < minimumSeconds) return true;

    taskActionInProgressRef.current = true;
    setIsTaskActionPending(true);
    targetEndTimeRef.current = null;
    timeLeftRef.current = remaining;
    setTimeLeft(remaining);
    setStatus("PAUSED");
    persistState(mode, "PAUSED", null, remaining, cycleCount, activeTask, notes);
    try {
      await recordPomodoroSession({
        eventId: activeTask?.calendarEventId,
        taskId: activeTask?.id,
        taskTitle: activeTask?.title,
        projectId: activeTask?.projectId,
        projectName: activeTask?.projectName,
        sessionType: mode,
        status: sessionStatus,
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: Math.round(totalDurationRef.current / 60),
        actualSeconds,
        notes: notes.trim() || undefined,
      });
      if (!mountedRef.current) return false;
      setSessionRevision((revision) => revision + 1);
      return true;
    } catch {
      if (mountedRef.current) {
        toast.error("Chưa lưu được phiên. Đã tạm dừng và giữ dữ liệu; hãy thử lại.");
      }
      return false;
    } finally {
      taskActionInProgressRef.current = false;
      setIsTaskActionPending(false);
    }
  }, [status, mode, cycleCount, activeTask, notes, persistState, pauseAmbient]);

  const setIdleMode = useCallback((nextMode: PomodoroMode, nextCycle: number) => {
    const duration = getDurationForMode(nextMode, config);
    sessionStartTimeRef.current = null;
    targetEndTimeRef.current = null;
    timeLeftRef.current = duration;
    setMode(nextMode);
    setStatus("IDLE");
    setCycleCount(nextCycle);
    setTimeLeft(duration);
    setTotalDuration(duration);
    persistState(nextMode, "IDLE", null, duration, nextCycle, activeTask, notes);
  }, [config, activeTask, notes, persistState, setTotalDuration]);

  const reset = useCallback(async () => {
    if (await saveInterruptedSession("STOPPED", 30)) setIdleMode(mode, cycleCount);
  }, [mode, cycleCount, saveInterruptedSession, setIdleMode]);

  const skip = useCallback(async (statusToRecord: PomodoroSessionStatus = "SKIPPED") => {
    if (!await saveInterruptedSession(statusToRecord, 0)) return;
    const next = getNextPomodoroCycleStep(mode, cycleCount, config.longBreakInterval);
    setIdleMode(next.mode, next.cycleCount);
  }, [mode, cycleCount, config.longBreakInterval, saveInterruptedSession, setIdleMode]);

  const switchMode = useCallback(async (newMode: PomodoroMode) => {
    if (mode === newMode || !await saveInterruptedSession("STOPPED", 30)) return;
    setIdleMode(newMode, cycleCount);
  }, [mode, cycleCount, saveInterruptedSession, setIdleMode]);

  const transitionTask = useCallback(async (
    nextTask: PomodoroActiveTask | null,
    updateSource?: (task: PomodoroActiveTask) => Promise<void>,
  ) => {
    if (!isHydratedRef.current || (updateSource && !activeTask)) throw new Error("Hãy chọn task trước.");
    if (taskActionInProgressRef.current || completionInProgressRef.current ||
      (status === "RUNNING" && targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) {
      throw new Error("Đang lưu phiên Pomodoro. Vui lòng thử lại sau.");
    }

    taskActionInProgressRef.current = true;
    setIsTaskActionPending(true);
    pauseAmbient();
    try {
      const startedAt = sessionStartTimeRef.current;
      if (startedAt !== null && status !== "IDLE") {
        const remaining = targetEndTimeRef.current !== null
          ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
          : timeLeftRef.current;
        const actualSeconds = Math.max(0, totalDuration - remaining);
        targetEndTimeRef.current = null;
        timeLeftRef.current = remaining;
        setTimeLeft(remaining);
        setStatus("PAUSED");
        persistState(mode, "PAUSED", null, remaining, cycleCount, activeTask, notes);
        try {
          await recordPomodoroSession({
            eventId: activeTask?.calendarEventId,
            taskId: activeTask?.id,
            taskTitle: activeTask?.title,
            projectId: activeTask?.projectId,
            projectName: activeTask?.projectName,
            sessionType: mode,
            status: "STOPPED",
            startedAt: new Date(startedAt).toISOString(),
            endedAt: new Date().toISOString(),
            durationMinutes: Math.round(totalDuration / 60),
            actualSeconds,
            notes: notes.trim() || undefined,
          });
        } catch {
          throw new Error("Chưa lưu được phiên tập trung. Task chưa đổi trạng thái; hãy thử lại.");
        }
        if (!mountedRef.current) return;
        setSessionRevision((revision) => revision + 1);
      }

      // Clear the saved session before updating the task, so retries cannot record it twice.
      const duration = getDurationForMode(mode, config);
      sessionStartTimeRef.current = null;
      targetEndTimeRef.current = null;
      timeLeftRef.current = duration;
      setStatus("IDLE");
      setTimeLeft(duration);
      setTotalDuration(duration);
      persistState(mode, "IDLE", null, duration, cycleCount, activeTask, notes);

      if (updateSource && activeTask) await updateSource(activeTask);
      if (!mountedRef.current) return;
      setActiveTask(nextTask);
      setNotes("");
      persistState(mode, "IDLE", null, duration, cycleCount, nextTask, "");
    } finally {
      taskActionInProgressRef.current = false;
      setIsTaskActionPending(false);
    }
  }, [activeTask, status, totalDuration, mode, cycleCount, config, notes, pauseAmbient, persistState, setTotalDuration]);

  const finishActiveTask = useCallback(
    (updateSource: (task: PomodoroActiveTask) => Promise<void>) => transitionTask(null, updateSource),
    [transitionTask],
  );

  const selectTask = useCallback(async (task: PomodoroActiveTask | null) => {
    if (task?.id === activeTask?.id && task?.calendarEventId === activeTask?.calendarEventId) return;
    try {
      await transitionTask(task);
    } catch (error) {
      if (mountedRef.current) toast.error(error instanceof Error ? error.message : "Không đổi được task.");
    }
  }, [activeTask, transitionTask]);

  const updateActiveTask = useCallback((task: PomodoroActiveTask) => {
    if (taskActionInProgressRef.current) return;
    setActiveTask((current) => current?.id === task.id && current.calendarEventId === task.calendarEventId ? task : current);
  }, []);

  const updateNotes = useCallback((value: string) => {
    if (!taskActionInProgressRef.current) setNotes(limitPomodoroNotes(value));
  }, []);

  const updateConfig = useCallback(
    async (newConfig: PomodoroConfig) => {
      if (!isHydratedRef.current || taskActionInProgressRef.current) return;
      setConfig(newConfig);
      saveLocalPomodoroConfig(userId, newConfig, true);
      pendingConfigRef.current = newConfig;
      void flushPendingConfig();

      if (status === "IDLE") {
        const dur = getDurationForMode(mode, newConfig);
        setTimeLeft(dur);
        setTotalDuration(dur);
        persistState(mode, "IDLE", null, dur, cycleCount, activeTask, notes);
      }
    },
    [status, mode, cycleCount, activeTask, notes, persistState, flushPendingConfig, userId, setTotalDuration],
  );

  return {
    isReady,
    loadError,
    sessionRevision,
    isTaskActionPending,
    finishActiveTask,
    mode,
    status,
    timeLeft,
    totalDuration,
    activeTask,
    config,
    notes,
    ambientTrack,
    ambientVolume,
    autoPlayAmbient,
    isAmbientPlaying,
    customTracks,
    start,
    pause,
    resume,
    reset,
    skip,
    switchMode,
    selectTask,
    updateActiveTask,
    setNotes: updateNotes,
    updateConfig,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    uploadCustomTrack,
    removeCustomTrack,
  };
}
