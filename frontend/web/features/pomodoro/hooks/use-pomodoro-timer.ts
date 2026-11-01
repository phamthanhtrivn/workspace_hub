"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PomodoroActiveTask,
  PomodoroMode,
  PomodoroSessionStatus,
  PomodoroStatus,
  PomodoroCompletionStatus,
} from "../types/pomodoro";
import {
  DEFAULT_POMODORO_CONFIG,
  recordPomodoroSession,
} from "../api/pomodoro-server.api";
import { getCalendarPomodoroTimerState } from "@/features/calendar/api/calendar.api";
import { toast } from "sonner";
import { playPomodoroSound } from "../utils/sound";
import { getNextPomodoroCycleStep } from "../utils/pomodoro-cycle";
import {
  loadLocalPomodoroTimerState,
  saveLocalPomodoroTimerState,
  wasPomodoroCompletionNotified,
  markPomodoroCompletionNotified,
} from "../utils/pomodoro-local-storage";
import { usePomodoroAmbient } from "./use-pomodoro-ambient";
import { limitPomodoroNotes } from "../utils/pomodoro-notes";
import { usePomodoroConfig } from "../components/pomodoro-config-provider";
import { getDurationForMode, getUpdatedIdleDuration } from "../utils/pomodoro-config";
import { focusSessionTaskId, normalizeFocusTask } from "../utils/focus-task";
import { prepareFocusTask } from "../api/focus-tasks.api";
import { POMODORO_TASK_MESSAGES } from "../constants/pomodoro-task";
import { usePomodoroTimerSync } from "./use-pomodoro-timer-sync";
import { timerSnapshotSignature, toPendingTimerState } from "../utils/pomodoro-timer-snapshot";

import { usePomodoroDocumentTitle } from "./use-pomodoro-document-title";
import { createPomodoroCompletion } from "../utils/pomodoro-completion";
import { sendPomodoroNotification } from "../utils/pomodoro-notifications";
import { POMODORO_INTERRUPTED_MINIMUM_SECONDS, POMODORO_SESSION_COPY } from "../constants/pomodoro-session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePomodoroTimer(userId: string) {
  const { config, ensureConfigLoaded, retryConfig, loadError: configLoadError } = usePomodoroConfig();
  const appliedConfigRef = useRef(DEFAULT_POMODORO_CONFIG);
  const [mode, setMode] = useState<PomodoroMode>("FOCUS");
  const [status, setStatus] = useState<PomodoroStatus>("IDLE");
  const [isReady, setIsReady] = useState(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [sessionIdentity, setSessionIdentity] = useState("idle");
  const [isTaskActionPending, setIsTaskActionPending] = useState(false);
  const taskActionInProgressRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [completionStatus, setCompletionStatus] = useState<PomodoroCompletionStatus>("idle");
  const [completion] = useState(createPomodoroCompletion);
  usePomodoroDocumentTitle(status, mode, timeLeft, completionStatus);

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
    audios,
    isAudioLibraryLoading,
    hasAudioLibraryError,
    retryAudioLibrary,
    hasPlaybackError,
    isAmbientReady,
    isTrackUnavailable,
    ambientSyncStatus,
    playAmbient,
    pauseAmbient,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
  } = usePomodoroAmbient(status, mode, userId);

  const targetEndTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const isHydratedRef = useRef<boolean>(false);
  const completionInProgressRef = useRef(false);
  const lastQueuedStateRef = useRef("");
  const timeLeftRef = useRef(timeLeft);
  const mountedRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const restoreRemoteState = useCallback((remote: Awaited<ReturnType<typeof getCalendarPomodoroTimerState>>) => {
    pauseAmbient();
    completion.clear();
    completionInProgressRef.current = false;
    setCompletionStatus("idle");
    sessionStartTimeRef.current = remote?.sessionStartAt ? Date.parse(remote.sessionStartAt) : null;
    setSessionIdentity(remote?.sessionStartAt ?? "idle");
    targetEndTimeRef.current = remote?.status === "RUNNING" && remote.targetEndAt ? Date.parse(remote.targetEndAt) : null;
    const remaining = targetEndTimeRef.current ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000)) : remote?.remainingSeconds ?? totalDurationRef.current;
    timeLeftRef.current = remaining;
    setTimeLeft(remaining);
    setTotalDuration(remote?.plannedSeconds ?? totalDurationRef.current);
    setMode(remote?.mode ?? "FOCUS");
    setStatus(remote?.status ?? "IDLE");
    setCycleCount(remote?.cycleCount ?? 0);
    setActiveTask(normalizeFocusTask(remote?.activeTask as unknown as PomodoroActiveTask | null));
    setNotes(limitPomodoroNotes(remote?.notes ?? ""));
    const saved = remote ?? {
      plannedSeconds: totalDurationRef.current, mode: "FOCUS", status: "IDLE",
      targetEndAt: null, remainingSeconds: totalDurationRef.current, cycleCount: 0,
      sessionStartAt: null, eventId: null, taskId: null, activeTask: null, notes: "",
      version: 0, updatedAt: new Date().toISOString(),
    } as const;
    saveLocalPomodoroTimerState(userId, saved);
    lastQueuedStateRef.current = timerSnapshotSignature(saved);
    isHydratedRef.current = true;
  }, [userId, setTotalDuration, completion, pauseAmbient]);

  const holdConflictingState = useCallback(() => {
    isHydratedRef.current = false;
    pauseAmbient();
    setStatus("PAUSED");
  }, [pauseAmbient]);
  const { sync, syncStatus, retrySync } = usePomodoroTimerSync(userId, restoreRemoteState, holdConflictingState);
  const retrySynchronization = useCallback(() => {
    retrySync();
    if (configLoadError) retryConfig();
  }, [configLoadError, retryConfig, retrySync]);

  // The provider stays mounted across workspace pages; only sync may be unavailable.
  useEffect(() => {
    mountedRef.current = true;
    let mounted = true;
    const controller = new AbortController();
    const localTimerState = loadLocalPomodoroTimerState(userId);
    void Promise.allSettled([ensureConfigLoaded(), getCalendarPomodoroTimerState(controller.signal)])
      .then(([configResult, timerStateResult]) => {
        if (!mounted) return;
        const cfg = configResult.status === "fulfilled" ? configResult.value : DEFAULT_POMODORO_CONFIG;
        const serverState = timerStateResult.status === "fulfilled" ? timerStateResult.value : null;
        const saved = serverState && localTimerState
          ? Date.parse(localTimerState.updatedAt) > Date.parse(serverState.updatedAt) ? localTimerState : serverState
          : serverState ?? localTimerState;
        const localPreferred = Boolean(saved && saved === localTimerState && saved !== serverState);
        if (saved) saveLocalPomodoroTimerState(userId, saved);
        appliedConfigRef.current = cfg;
        if (saved) {
          const restoredMode = saved.mode as PomodoroMode;
          const duration = saved.plannedSeconds ?? getDurationForMode(restoredMode, cfg);
          setMode(restoredMode);
          setCycleCount(saved.cycleCount);
          setActiveTask(normalizeFocusTask(saved.activeTask as unknown as PomodoroActiveTask | null) ?? (saved.eventId ? {
            id: saved.taskId ?? saved.eventId, calendarEventId: saved.eventId,
            source: "CALENDAR_TASK", title: "Restored Calendar session",
          } : null));
          setNotes(limitPomodoroNotes(saved.notes));
          setTotalDuration(duration);
          sessionStartTimeRef.current = saved.sessionStartAt ? Date.parse(saved.sessionStartAt) : null;
          setSessionIdentity(saved.sessionStartAt ?? "idle");
          const target = saved.targetEndAt ? Date.parse(saved.targetEndAt) : null;
          const remaining = target ? Math.max(0, Math.round((target - Date.now()) / 1000)) : saved.remainingSeconds;
          targetEndTimeRef.current = saved.status === "RUNNING" ? target : null;
          timeLeftRef.current = saved.status === "IDLE" ? saved.remainingSeconds || duration : remaining;
          setTimeLeft(timeLeftRef.current);
          setStatus(saved.status);
        } else {
          setTimeLeft(getDurationForMode("FOCUS", cfg));
          setTotalDuration(getDurationForMode("FOCUS", cfg));
        }
        isHydratedRef.current = true;
        sync.initialize(saved?.version ?? 0, localPreferred || timerStateResult.status === "rejected",
          localPreferred && saved ? toPendingTimerState(saved) : undefined,
          timerStateResult.status === "rejected" ? timerStateResult.reason : undefined);
        setIsReady(true);
      });
    return () => {
      mounted = false;
      controller.abort();
      mountedRef.current = false;
      isHydratedRef.current = false;
      completion.clear();
    };
  }, [userId, setTotalDuration, ensureConfigLoaded, completion, sync]);

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
      setSessionIdentity(sessionStart ? new Date(sessionStart).toISOString() : "idle");
      const snapshot = {
        plannedSeconds: totalDurationRef.current,
        mode: newMode,
        status: newStatus,
        targetEndAt: targetEnd ? new Date(targetEnd).toISOString() : null,
        remainingSeconds: remainingSec,
        cycleCount: cycle,
        sessionStartAt: sessionStart ? new Date(sessionStart).toISOString() : null,
        taskId: focusSessionTaskId(task) && UUID.test(task!.id) ? task!.id : null,
        activeTask: task as unknown as Record<string, unknown> | null,
        notes: limitPomodoroNotes(noteText),
        eventId: task?.calendarEventId ?? null,
      };
      const signature = timerSnapshotSignature(snapshot);
      if (signature === lastQueuedStateRef.current) return;
      lastQueuedStateRef.current = signature;
      saveLocalPomodoroTimerState(userId, {
        ...snapshot,
        version: sync.getVersion(),
        updatedAt: new Date().toISOString(),
      });
      sync.enqueue(snapshot);
    },
    [sync, userId],
  );

  useEffect(() => {
    if (isHydratedRef.current) {
      persistState(mode, status, targetEndTimeRef.current, timeLeftRef.current, cycleCount, activeTask, notes);
    }
  }, [activeTask, notes, mode, status, cycleCount, persistState]);

  // Handle session completion
  const handleSessionComplete = useCallback(async (force = false) => {
    const now = Date.now();
    if (!isHydratedRef.current || status !== "RUNNING" || targetEndTimeRef.current === null ||
      targetEndTimeRef.current > now || taskActionInProgressRef.current || completionInProgressRef.current) return;
    completionInProgressRef.current = true;
    pauseAmbient();
    timeLeftRef.current = 0;
    setTimeLeft(0);
    const endedAt = new Date(targetEndTimeRef.current).toISOString();
    const startedAt = new Date(sessionStartTimeRef.current ?? targetEndTimeRef.current - totalDuration * 1000).toISOString();
    const completionKey = `${mode}:${startedAt}`;
    const saved = await completion.run({
      key: completionKey,
      session: {
        eventId: activeTask?.calendarEventId, taskId: focusSessionTaskId(activeTask),
        taskTitle: activeTask?.title, projectId: activeTask?.projectId, projectName: activeTask?.projectName,
        sessionType: mode, status: "COMPLETED", startedAt, endedAt,
        durationMinutes: Math.round(totalDuration / 60), actualSeconds: totalDuration,
        notes: notes.trim() || undefined,
      },
    }, {
      now,
      wasNotified: (key) => wasPomodoroCompletionNotified(userId, key),
      markNotified: (key) => markPomodoroCompletionNotified(userId, key),
      notify: () => {
        if (config.soundEnabled) {
          try { playPomodoroSound(config.soundType, config.soundVolume); } catch { /* Recording still proceeds. */ }
        }
        if (config.notificationEnabled) {
          sendPomodoroNotification(mode === "FOCUS" ? POMODORO_SESSION_COPY.focusEndedTitle : POMODORO_SESSION_COPY.breakEndedTitle,
            mode === "FOCUS" ? POMODORO_SESSION_COPY.focusEndedBody : POMODORO_SESSION_COPY.breakEndedBody);
        }
      },
      record: recordPomodoroSession,
      onStatus: setCompletionStatus,
      onFirstError: () => toast.error(POMODORO_SESSION_COPY.saveFailed),
    }, force);
    if (!saved || !mountedRef.current || !isHydratedRef.current) {
      completionInProgressRef.current = false;
      return;
    }
    setSessionRevision((revision) => revision + 1);
    if (mode === "FOCUS" && activeTask) {
      setActiveTask((current) => current?.id === activeTask.id
        ? { ...current, completedPomodoros: (current.completedPomodoros || 0) + 1 } : current);
    }

    // 4. Determine next mode
    const nextStep = getNextPomodoroCycleStep(
      mode,
      cycleCount,
      config.longBreakInterval || 2,
    );
    const nextMode = nextStep.mode;
    const nextCycle = nextStep.cycleCount;
    const nextDuration = getDurationForMode(nextMode, config);

    let nextTask = activeTask;
    let shouldAutoStart =
      (nextMode !== "FOCUS" && config.autoStartBreak) ||
      (nextMode === "FOCUS" && config.autoStartFocus);

    if (shouldAutoStart && nextMode === "FOCUS" && activeTask) {
      try {
        nextTask = await prepareFocusTask(activeTask, userId);
      } catch (error) {
        shouldAutoStart = false;
        toast.error(error instanceof Error ? error.message : POMODORO_TASK_MESSAGES.unavailable);
      }
    }

    if (!mountedRef.current || !completion.isCurrent(completionKey)) {
      completionInProgressRef.current = false;
      return;
    }
    setCycleCount(nextCycle);
    setMode(nextMode);
    setTotalDuration(nextDuration);
    timeLeftRef.current = nextDuration;
    setTimeLeft(nextDuration);
    if (nextTask !== activeTask) setActiveTask(nextTask);
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
        nextTask,
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
    setCompletionStatus("idle");
  }, [
    status,
    completion,
    config,
    mode,
    totalDuration,
    notes,
    activeTask,
    cycleCount,
    autoPlayAmbient,
    ambientTrack,
    persistState,
    pauseAmbient,
    playAmbient,
    setTotalDuration,
    userId,
  ]);

  const retryCompletion = useCallback(() => handleSessionComplete(true), [handleSessionComplete]);

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

        if (diff <= 0) {
          void handleSessionComplete();
        }
      }, 1000);
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
    const remaining = timeLeftRef.current;
    targetEndTimeRef.current = now + remaining * 1000;
    setStatus("RUNNING");

    // Resume ambient music if in Focus
    if (mode === "FOCUS" && autoPlayAmbient && ambientTrack !== "none") {
      playAmbient();
    }

    persistState(
      mode,
      "RUNNING",
      targetEndTimeRef.current,
      remaining,
      cycleCount,
      activeTask,
      notes,
    );
  }, [status, mode, cycleCount, activeTask, notes, autoPlayAmbient, ambientTrack, persistState, playAmbient]);

  const saveInterruptedSession = useCallback(async (
    sessionStatus: PomodoroSessionStatus,
    minimumSeconds: number,
    notifyFailure = true,
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
        taskId: focusSessionTaskId(activeTask),
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
      if (mountedRef.current && notifyFailure) {
        toast.error("Unable to save the session. It has been paused and your data kept; please try again.");
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
    if (!await saveInterruptedSession("STOPPED", POMODORO_INTERRUPTED_MINIMUM_SECONDS)) return false;
    setIdleMode(mode, cycleCount);
    return true;
  }, [mode, cycleCount, saveInterruptedSession, setIdleMode]);

  const skip = useCallback(async (statusToRecord: PomodoroSessionStatus = "SKIPPED") => {
    if (!await saveInterruptedSession(statusToRecord, 0)) return false;
    const next = getNextPomodoroCycleStep(mode, cycleCount, config.longBreakInterval);
    setIdleMode(next.mode, next.cycleCount);
    return true;
  }, [mode, cycleCount, config.longBreakInterval, saveInterruptedSession, setIdleMode]);

  const switchMode = useCallback(async (newMode: PomodoroMode) => {
    if (mode === newMode) return true;
    if (!await saveInterruptedSession("STOPPED", POMODORO_INTERRUPTED_MINIMUM_SECONDS)) return false;
    setIdleMode(newMode, cycleCount);
    return true;
  }, [mode, cycleCount, saveInterruptedSession, setIdleMode]);

  const transitionTask = useCallback(async (
    nextTask: PomodoroActiveTask | null,
    updateSource?: (task: PomodoroActiveTask) => Promise<void>,
    focus?: { prepare?: (task: PomodoroActiveTask) => Promise<PomodoroActiveTask> },
  ) => {
    if (!isHydratedRef.current || (updateSource && !activeTask)) throw new Error("Please select a task first.");
    if (taskActionInProgressRef.current || completionInProgressRef.current ||
      (status === "RUNNING" && targetEndTimeRef.current !== null && targetEndTimeRef.current <= Date.now())) {
      throw new Error("Saving the Pomodoro session. Please try again later.");
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
            taskId: focusSessionTaskId(activeTask),
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
          throw new Error("Unable to save the focus session. The task status has not changed; please try again.");
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
      if (focus?.prepare && nextTask) nextTask = await focus.prepare(nextTask);
      if (!mountedRef.current) return;
      setActiveTask(nextTask);
      setNotes("");
      if (focus) {
        const focusDuration = getDurationForMode("FOCUS", config);
        const now = Date.now();
        sessionStartTimeRef.current = now;
        targetEndTimeRef.current = now + focusDuration * 1000;
        timeLeftRef.current = focusDuration;
        setMode("FOCUS");
        setStatus("RUNNING");
        setTimeLeft(focusDuration);
        setTotalDuration(focusDuration);
        persistState("FOCUS", "RUNNING", targetEndTimeRef.current, focusDuration, cycleCount, nextTask, "");
        if (autoPlayAmbient && ambientTrack !== "none") playAmbient();
      } else {
        persistState(mode, "IDLE", null, duration, cycleCount, nextTask, "");
      }
    } finally {
      taskActionInProgressRef.current = false;
      setIsTaskActionPending(false);
    }
  }, [activeTask, status, totalDuration, mode, cycleCount, config, notes, pauseAmbient, persistState, setTotalDuration, autoPlayAmbient, ambientTrack, playAmbient]);

  const beginFocusTask = useCallback((task: PomodoroActiveTask, prepare: (task: PomodoroActiveTask) => Promise<PomodoroActiveTask>) =>
    transitionTask(task, undefined, { prepare }), [transitionTask]);

  const beginFreeFocus = useCallback(() => transitionTask(null, undefined, {}), [transitionTask]);

  const stopSession = useCallback(async () => {
    if (status === "IDLE") return;
    if (!await saveInterruptedSession("STOPPED", 0, false)) throw new Error(POMODORO_SESSION_COPY.stopFailed);
    setIdleMode("FOCUS", cycleCount);
  }, [status, saveInterruptedSession, setIdleMode, cycleCount]);

  const finishActiveTask = useCallback(
    (updateSource: (task: PomodoroActiveTask) => Promise<void>) => transitionTask(null, updateSource),
    [transitionTask],
  );

  const selectTask = useCallback(async (task: PomodoroActiveTask | null) => {
    if (task?.id === activeTask?.id && task?.calendarEventId === activeTask?.calendarEventId) return;
    try {
      await transitionTask(task);
    } catch (error) {
      if (mountedRef.current) toast.error(error instanceof Error ? error.message : "Unable to switch tasks.");
    }
  }, [activeTask, transitionTask]);

  const updateActiveTask = useCallback((task: PomodoroActiveTask) => {
    if (taskActionInProgressRef.current || (status === "RUNNING" && timeLeftRef.current === 0)) return;
    setActiveTask((current) => current?.id === task.id && current.calendarEventId === task.calendarEventId ? task : current);
  }, [status]);

  const updateNotes = useCallback((value: string) => {
    if (!taskActionInProgressRef.current && !(status === "RUNNING" && timeLeftRef.current === 0)) setNotes(limitPomodoroNotes(value));
  }, [status]);

  useEffect(() => {
    if (!isReady || !isHydratedRef.current || isTaskActionPending) return;
    const duration = getUpdatedIdleDuration(appliedConfigRef.current, config, mode, status);
    appliedConfigRef.current = config;
    if (duration === null) return;
    // Shared settings are an external update; running/paused snapshots stay intact.
    setTimeLeft(duration);
    setTotalDuration(duration);
    persistState(mode, "IDLE", null, duration, cycleCount, activeTask, notes);
  }, [activeTask, config, cycleCount, isReady, isTaskActionPending, mode, notes, persistState, setTotalDuration, status]);

  return {
    isReady,
    loadError: syncStatus === "pending" || syncStatus === "error" || configLoadError,
    syncStatus,
    retrySync: retrySynchronization,
    configLoadError,
    sessionRevision,
    isTaskActionPending,
    finishActiveTask,
    beginFocusTask,
    beginFreeFocus,
    stopSession,
    mode,
    status,
    timeLeft,
    cycleCount,
    completionStatus,
    retryCompletion,
    sessionIdentity: `${mode}:${sessionIdentity}:${activeTask?.calendarEventId ?? activeTask?.id ?? "free"}`,
    totalDuration,
    activeTask,
    config,
    notes,
    ambientTrack,
    ambientVolume,
    autoPlayAmbient,
    isAmbientPlaying,
    audios,
    isAudioLibraryLoading,
    hasAudioLibraryError,
    retryAudioLibrary,
    hasPlaybackError,
    isAmbientReady,
    isTrackUnavailable,
    ambientSyncStatus,
    start,
    pause,
    resume,
    reset,
    skip,
    switchMode,
    selectTask,
    updateActiveTask,
    setNotes: updateNotes,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
  };
}
