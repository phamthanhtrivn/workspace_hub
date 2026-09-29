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
  loadLocalPomodoroTimerState,
  saveLocalPomodoroConfig,
  saveLocalPomodoroTimerState,
} from "../utils/pomodoro-local-storage";
import { usePomodoroAmbient } from "./use-pomodoro-ambient";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PendingTimerState = Omit<Parameters<typeof saveCalendarPomodoroTimerState>[0], "expectedVersion">;

function toPendingTimerState(state: Parameters<typeof saveLocalPomodoroTimerState>[0]): PendingTimerState {
  return {
    mode: state.mode,
    status: state.status,
    targetEndAt: state.targetEndAt,
    remainingSeconds: state.remainingSeconds,
    cycleCount: state.cycleCount,
    sessionStartAt: state.sessionStartAt,
    eventId: state.eventId,
    taskId: state.taskId,
    activeTask: state.activeTask,
    notes: state.notes,
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

export function usePomodoroTimer() {
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [mode, setMode] = useState<PomodoroMode>("FOCUS");
  const [status, setStatus] = useState<PomodoroStatus>("IDLE");
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [totalDuration, setTotalDuration] = useState<number>(25 * 60);
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
  } = usePomodoroAmbient(status);

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

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Load server-backed config and timer state on mount.
  useEffect(() => {
    if (typeof document !== "undefined") {
      initialTitleRef.current = document.title || "WorkSpaceHub";
    }

    let mounted = true;
    const localConfig = loadLocalPomodoroConfig();
    const localTimerState = loadLocalPomodoroTimerState();

    void Promise.allSettled([getPomodoroConfig(), getCalendarPomodoroTimerState()])
      .then(([configResult, timerStateResult]) => {
        if (!mounted) return;
        const cfg = configResult.status === "fulfilled"
          ? configResult.value
          : localConfig ?? DEFAULT_POMODORO_CONFIG;
        const serverState = timerStateResult.status === "fulfilled"
          ? timerStateResult.value
          : null;
        const saved = serverState && localTimerState
          ? Date.parse(localTimerState.updatedAt) > Date.parse(serverState.updatedAt)
            ? localTimerState
            : serverState
          : serverState ?? localTimerState;
        configSyncFailedRef.current = configResult.status === "rejected";
        stateSyncFailedRef.current = timerStateResult.status === "rejected";
        const hasServerError = configSyncFailedRef.current || stateSyncFailedRef.current;

        if (configResult.status === "fulfilled") saveLocalPomodoroConfig(cfg);
        else if (localConfig) pendingConfigRef.current = localConfig;
        if (saved) saveLocalPomodoroTimerState(saved);
        if (saved && saved === localTimerState && saved !== serverState) {
          pendingStateRef.current = toPendingTimerState(saved);
        }
        setConfig(cfg);
        stateVersionRef.current = saved?.version ?? 0;
        if (saved) {
          const restoredMode = saved.mode as PomodoroMode;
          const duration = getDurationForMode(restoredMode, cfg);
          setMode(restoredMode);
          setCycleCount(saved.cycleCount);
          setActiveTask(saved.activeTask as unknown as PomodoroActiveTask | null);
          setNotes(saved.notes);
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
    };
  }, []);

  const flushPendingConfig = useCallback(async () => {
    if (configSaveInFlightRef.current || !pendingConfigRef.current) return;
    configSaveInFlightRef.current = true;
    let failedConfig: PomodoroConfig | null = null;
    try {
      while (pendingConfigRef.current) {
        const pendingConfig = pendingConfigRef.current;
        failedConfig = pendingConfig;
        pendingConfigRef.current = null;
        await savePomodoroConfig(pendingConfig);
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
  }, []);

  // Keep one write in flight and replace queued changes with the latest state.
  const flushPendingState = useCallback(async () => {
    if (stateSaveInFlightRef.current) return;
    stateSaveInFlightRef.current = true;
    let failedSnapshot: PendingTimerState | null = null;
    try {
      if (refreshVersionBeforeRetryRef.current) {
        const remoteState = await getCalendarPomodoroTimerState();
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
        stateVersionRef.current = saved.version;
        saveLocalPomodoroTimerState({
          ...snapshot,
          version: saved.version,
          updatedAt: saved.updatedAt ?? new Date().toISOString(),
        });
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
  }, []);

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
        mode: newMode,
        status: newStatus,
        targetEndAt: targetEnd ? new Date(targetEnd).toISOString() : null,
        remainingSeconds: remainingSec,
        cycleCount: cycle,
        sessionStartAt: sessionStart ? new Date(sessionStart).toISOString() : null,
        taskId: task?.id && UUID.test(task.id) ? task.id : null,
        activeTask: task as unknown as Record<string, unknown> | null,
        notes: noteText,
        eventId: task?.calendarEventId ?? null,
      };
      const signature = JSON.stringify(snapshot);
      if (signature === lastQueuedStateRef.current) return;
      lastQueuedStateRef.current = signature;
      saveLocalPomodoroTimerState({
        ...snapshot,
        version: stateVersionRef.current,
        updatedAt: new Date().toISOString(),
      });
      pendingStateRef.current = snapshot;
      void flushPendingState();
    },
    [flushPendingState],
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
          saveLocalPomodoroConfig(serverConfig);
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
  }, [flushPendingConfig, flushPendingState, isReady, loadError]);

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
    if (completionInProgressRef.current || now - lastCompletionAttemptRef.current < 15_000) return;
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
    if (!isHydratedRef.current) return;
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
    const duration = timeLeft > 0 ? timeLeft : getDurationForMode(mode, config);
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
    timeLeft,
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
  ]);

  const pause = useCallback(() => {
    if (status !== "RUNNING") return;
    if (completionInProgressRef.current || (targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) return;

    setStatus("PAUSED");
    targetEndTimeRef.current = null;

    // Pause ambient sound
    pauseAmbient();

    persistState(
      mode,
      "PAUSED",
      null,
      timeLeft,
      cycleCount,
      activeTask,
      notes,
    );
  }, [status, mode, timeLeft, cycleCount, activeTask, notes, persistState, pauseAmbient]);

  const resume = useCallback(() => {
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

  const reset = useCallback(
    () => {
      if (completionInProgressRef.current || (status === "RUNNING" && targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) return;
      pauseAmbient();

      // Save partial session if it was running for at least 30s
      if (sessionStartTimeRef.current && status !== "IDLE") {
        const actualSeconds = Math.max(0, totalDuration - timeLeft);
        if (actualSeconds >= 30) {
          void recordPomodoroSession({
            eventId: activeTask?.calendarEventId,
            taskId: activeTask?.id,
            taskTitle: activeTask?.title,
            projectId: activeTask?.projectId,
            projectName: activeTask?.projectName,
            sessionType: mode,
            status: "STOPPED",
            startedAt: new Date(sessionStartTimeRef.current).toISOString(),
            endedAt: new Date().toISOString(),
            durationMinutes: Math.round(actualSeconds / 60),
            actualSeconds,
            notes: notes.trim() || undefined,
          }).then(() => setSessionRevision((revision) => revision + 1))
            .catch(() => toast.error("Không lưu được phiên Pomodoro lên máy chủ."));
        }
      }

      const defaultDur = getDurationForMode(mode, config);
      setStatus("IDLE");
      setTimeLeft(defaultDur);
      setTotalDuration(defaultDur);
      targetEndTimeRef.current = null;
      sessionStartTimeRef.current = null;
      persistState(
        mode,
        "IDLE",
        null,
        defaultDur,
        cycleCount,
        activeTask,
        notes,
      );
    },
    [status, mode, config, cycleCount, activeTask, notes, totalDuration, timeLeft, persistState, pauseAmbient],
  );

  const skip = useCallback(
    (statusToRecord: PomodoroSessionStatus = "SKIPPED") => {
      if (completionInProgressRef.current || (status === "RUNNING" && targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) return;
      pauseAmbient();

      if (sessionStartTimeRef.current) {
        const actualSeconds = Math.max(0, totalDuration - timeLeft);
        void recordPomodoroSession({
          eventId: activeTask?.calendarEventId,
          taskId: activeTask?.id,
          taskTitle: activeTask?.title,
          projectId: activeTask?.projectId,
          projectName: activeTask?.projectName,
          sessionType: mode,
          status: statusToRecord,
          startedAt: new Date(sessionStartTimeRef.current).toISOString(),
          endedAt: new Date().toISOString(),
          durationMinutes: Math.round(actualSeconds / 60),
          actualSeconds,
          notes: notes.trim() || undefined,
        }).then(() => setSessionRevision((revision) => revision + 1))
          .catch(() => toast.error("Không lưu được phiên Pomodoro lên máy chủ."));
      }

      // Switch to next mode
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
      setStatus("IDLE");
      setTimeLeft(nextDuration);
      setTotalDuration(nextDuration);
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
    },
    [mode, status, cycleCount, config, activeTask, notes, totalDuration, timeLeft, persistState, pauseAmbient],
  );

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      if (mode === newMode) return;
      if (completionInProgressRef.current || (status === "RUNNING" && targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) return;
      if (status !== "IDLE") {
        reset();
      } else if (newMode !== "FOCUS") {
        pauseAmbient();
      }

      setMode(newMode);
      const newDur = getDurationForMode(newMode, config);
      setStatus("IDLE");
      setTimeLeft(newDur);
      setTotalDuration(newDur);
      targetEndTimeRef.current = null;
      sessionStartTimeRef.current = null;
      persistState(
        newMode,
        "IDLE",
        null,
        newDur,
        cycleCount,
        activeTask,
        notes,
      );
    },
    [mode, status, reset, config, cycleCount, activeTask, notes, persistState, pauseAmbient],
  );

  const updateConfig = useCallback(
    async (newConfig: PomodoroConfig) => {
      setConfig(newConfig);
      saveLocalPomodoroConfig(newConfig);
      pendingConfigRef.current = newConfig;
      void flushPendingConfig();

      if (status === "IDLE") {
        const dur = getDurationForMode(mode, newConfig);
        setTimeLeft(dur);
        setTotalDuration(dur);
        persistState(mode, "IDLE", null, dur, cycleCount, activeTask, notes);
      }
    },
    [status, mode, cycleCount, activeTask, notes, persistState, flushPendingConfig],
  );

  return {
    isReady,
    loadError,
    sessionRevision,
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
    setActiveTask,
    setNotes,
    updateConfig,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    uploadCustomTrack,
    removeCustomTrack,
  };
}
