"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PomodoroActiveTask,
  PomodoroConfig,
  PomodoroMode,
  PomodoroSessionStatus,
  PomodoroStatus,
} from "../types/pomodoro";
import type { AmbientTrackId } from "../types/ambient";
import {
  DEFAULT_POMODORO_CONFIG,
  getPomodoroConfig,
  recordPomodoroSession,
  savePomodoroConfig,
} from "../api/pomodoro.api";
import { playPomodoroSound } from "../utils/sound";
import { ambientAudio } from "../utils/ambient-audio";
import {
  deleteCustomAudioTrack,
  loadCustomAudioTracks,
  saveCustomAudioTrack,
  type CustomTrackRecord,
} from "../utils/audio-storage";

const TIMER_STORAGE_KEY = "workspace_hub_pomodoro_state";
const AMBIENT_STORAGE_KEY = "workspace_hub_pomodoro_ambient";

interface PersistedTimerState {
  mode: PomodoroMode;
  status: PomodoroStatus;
  targetEndTime: number | null;
  remainingSeconds: number;
  cycleCount: number;
  sessionStartTime: number | null;
  activeTask: PomodoroActiveTask | null;
  notes: string;
}

function getDurationForMode(
  targetMode: PomodoroMode,
  cfg: PomodoroConfig,
): number {
  switch (targetMode) {
    case "FOCUS":
      return (cfg.focusDuration || 25) * 60;
    case "SHORT_BREAK":
      return (cfg.shortBreak || 5) * 60;
    case "LONG_BREAK":
      return (cfg.longBreak || 15) * 60;
  }
}

export function usePomodoroTimer() {
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [mode, setMode] = useState<PomodoroMode>("FOCUS");
  const [status, setStatus] = useState<PomodoroStatus>("IDLE");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [totalDuration, setTotalDuration] = useState<number>(25 * 60);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [activeTask, setActiveTask] = useState<PomodoroActiveTask | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isInterruptionOpen, setIsInterruptionOpen] = useState<boolean>(false);

  // Ambient Audio State
  const [ambientTrack, setAmbientTrack] = useState<AmbientTrackId>("lofi_relax");
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);
  const [autoPlayAmbient, setAutoPlayAmbient] = useState<boolean>(true);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState<boolean>(false);
  const [customTracks, setCustomTracks] = useState<CustomTrackRecord[]>([]);

  const targetEndTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const initialTitleRef = useRef<string>("");
  const isHydratedRef = useRef<boolean>(false);

  // Load config & ambient preferences & custom tracks on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      initialTitleRef.current = document.title || "WorkSpaceHub";
    }

    getPomodoroConfig().then((cfg) => {
      setConfig(cfg);
      setIsMuted(!cfg.soundEnabled);
    });

    // Load custom uploaded audio tracks from IndexedDB
    loadCustomAudioTracks().then((tracks) => {
      setCustomTracks(tracks);

      try {
        const savedAmbient = localStorage.getItem(AMBIENT_STORAGE_KEY);
        if (savedAmbient) {
          const parsed = JSON.parse(savedAmbient);
          if (parsed.track) {
            setAmbientTrack(parsed.track);
            const foundCustom = tracks.find((t) => t.id === parsed.track);
            ambientAudio.setTrack(parsed.track, foundCustom?.url);
          }
          if (typeof parsed.volume === "number") {
            setAmbientVolume(parsed.volume);
            ambientAudio.setVolume(parsed.volume);
          }
          if (typeof parsed.autoPlay === "boolean") {
            setAutoPlayAmbient(parsed.autoPlay);
          }
        } else {
          ambientAudio.setTrack("lofi_relax");
          ambientAudio.setVolume(0.5);
        }
      } catch {
        // ignore
      }
    });
  }, []);

  // Restore persisted timer state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const parsed: PersistedTimerState = JSON.parse(saved);
        const validModes: PomodoroMode[] = [
          "FOCUS",
          "SHORT_BREAK",
          "LONG_BREAK",
        ];
        const restoredMode = validModes.includes(parsed.mode)
          ? parsed.mode
          : "FOCUS";

        setMode(restoredMode);
        setCycleCount(parsed.cycleCount || 0);
        setActiveTask(parsed.activeTask || null);
        setNotes(parsed.notes || "");
        const sessionFullDur =
          getDurationForMode(restoredMode, config) ||
          config.focusDuration * 60;
        setTotalDuration(sessionFullDur);

        if (parsed.status === "RUNNING" && parsed.targetEndTime) {
          const now = Date.now();
          const remaining = Math.max(
            0,
            Math.round((parsed.targetEndTime - now) / 1000),
          );

          if (remaining > 0) {
            targetEndTimeRef.current = parsed.targetEndTime;
            setTimeLeft(remaining);
            setStatus("RUNNING");
          } else {
            // Completed while away
            setTimeLeft(0);
            setStatus("IDLE");
          }
        } else if (parsed.status === "PAUSED") {
          setTimeLeft(parsed.remainingSeconds);
          setStatus("PAUSED");
        } else {
          // IDLE
          setTimeLeft(sessionFullDur);
          setStatus("IDLE");
        }
      } else {
        const dur = (config.focusDuration || 25) * 60;
        setTimeLeft(dur);
        setTotalDuration(dur);
      }
    } catch {
      // ignore
    }
  }, [config.focusDuration, config.shortBreak, config.longBreak]);

  // Persist activeTask and notes immediately when modified
  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      return;
    }
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      const prev = saved ? JSON.parse(saved) : {};
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          ...prev,
          mode,
          status,
          cycleCount,
          activeTask,
          notes,
        }),
      );
    } catch {
      // ignore
    }
  }, [activeTask, notes, mode, status, cycleCount]);

  // Sync state to LocalStorage
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
      try {
        const state: PersistedTimerState = {
          mode: newMode,
          status: newStatus,
          targetEndTime: targetEnd,
          remainingSeconds: remainingSec,
          cycleCount: cycle,
          sessionStartTime: sessionStartTimeRef.current,
          activeTask: task,
          notes: noteText,
        };
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore
      }
    },
    [],
  );

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
  const handleSessionComplete = useCallback(() => {
    // Stop ambient sound during alert & break transition
    ambientAudio.pause();
    setIsAmbientPlaying(false);

    // 1. Play alert sound
    if (!isMuted && config.soundEnabled) {
      playPomodoroSound(config.soundType, config.soundVolume);
    }

    // 2. Browser notification
    const modeLabel =
      mode === "FOCUS" ? "Phiên tập trung" : "Thời gian nghỉ ngơi";
    sendBrowserNotification(
      `${modeLabel} đã kết thúc!`,
      mode === "FOCUS"
        ? "Tuyệt vời! Hãy cho mắt và đầu óc nghỉ ngơi một chút."
        : "Đã hết giờ giải lao. Sẵn sàng cho phiên tập trung tiếp theo?",
    );

    // 3. Save session to record
    const startedAt = sessionStartTimeRef.current
      ? new Date(sessionStartTimeRef.current).toISOString()
      : new Date(Date.now() - totalDuration * 1000).toISOString();
    const endedAt = new Date().toISOString();

    recordPomodoroSession({
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

    // 4. Update task completed pomodoros count if Focus
    if (mode === "FOCUS" && activeTask) {
      setActiveTask((prev) =>
        prev
          ? {
              ...prev,
              completedPomodoros: (prev.completedPomodoros || 0) + 1,
            }
          : null,
      );
    }

    // 5. Determine next mode
    let nextMode: PomodoroMode = "FOCUS";
    let nextCycle = cycleCount;

    if (mode === "FOCUS") {
      nextCycle = cycleCount + 1;
      setCycleCount(nextCycle);

      if (nextCycle >= (config.longBreakInterval || 4)) {
        nextMode = "LONG_BREAK";
        setCycleCount(0);
      } else {
        nextMode = "SHORT_BREAK";
      }
    } else {
      nextMode = "FOCUS";
    }

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
        ambientAudio.play();
        setIsAmbientPlaying(true);
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
  }, [
    isMuted,
    config,
    mode,
    totalDuration,
    notes,
    activeTask,
    cycleCount,
    autoPlayAmbient,
    ambientTrack,
    getDurationForMode,
    persistState,
    sendBrowserNotification,
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
          clearInterval(interval!);
          handleSessionComplete();
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
      ambientAudio.play();
      setIsAmbientPlaying(true);
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
    mode,
    cycleCount,
    activeTask,
    notes,
    autoPlayAmbient,
    ambientTrack,
    getDurationForMode,
    persistState,
  ]);

  const pause = useCallback(() => {
    if (status !== "RUNNING") return;

    setStatus("PAUSED");
    targetEndTimeRef.current = null;

    // Pause ambient sound
    ambientAudio.pause();
    setIsAmbientPlaying(false);

    persistState(
      mode,
      "PAUSED",
      null,
      timeLeft,
      cycleCount,
      activeTask,
      notes,
    );
  }, [status, mode, timeLeft, cycleCount, activeTask, notes, persistState]);

  const resume = useCallback(() => {
    if (status !== "PAUSED") return;

    const now = Date.now();
    targetEndTimeRef.current = now + timeLeft * 1000;
    setStatus("RUNNING");

    // Resume ambient music if in Focus
    if (mode === "FOCUS" && autoPlayAmbient && ambientTrack !== "none") {
      ambientAudio.play();
      setIsAmbientPlaying(true);
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
  }, [status, timeLeft, mode, cycleCount, activeTask, notes, autoPlayAmbient, ambientTrack, persistState]);

  const reset = useCallback(
    (reason?: string) => {
      ambientAudio.pause();
      setIsAmbientPlaying(false);

      // Save partial session if it was running for at least 30s
      if (sessionStartTimeRef.current && status !== "IDLE") {
        const actualSeconds = Math.round(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );
        if (actualSeconds >= 30) {
          recordPomodoroSession({
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
            interruptionReason: reason,
            notes: notes.trim() || undefined,
          });
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
    [status, mode, config, cycleCount, activeTask, notes, getDurationForMode, persistState],
  );

  const skip = useCallback(
    (statusToRecord: PomodoroSessionStatus = "SKIPPED") => {
      ambientAudio.pause();
      setIsAmbientPlaying(false);

      if (sessionStartTimeRef.current) {
        const actualSeconds = Math.max(
          1,
          Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
        );
        recordPomodoroSession({
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
        });
      }

      // Switch to next mode
      let nextMode: PomodoroMode = "FOCUS";
      let nextCycle = cycleCount;

      if (mode === "FOCUS") {
        nextCycle = cycleCount + 1;
        setCycleCount(nextCycle);
        nextMode =
          nextCycle >= (config.longBreakInterval || 4)
            ? "LONG_BREAK"
            : "SHORT_BREAK";
        if (nextMode === "LONG_BREAK") setCycleCount(0);
      } else {
        nextMode = "FOCUS";
      }

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
    [mode, cycleCount, config, activeTask, notes, getDurationForMode, persistState],
  );

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      if (mode === newMode) return;
      if (newMode !== "FOCUS") {
        ambientAudio.pause();
        setIsAmbientPlaying(false);
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
    [mode, config, cycleCount, activeTask, notes, getDurationForMode, persistState],
  );

  const updateConfig = useCallback(
    async (newConfig: PomodoroConfig) => {
      setConfig(newConfig);
      setIsMuted(!newConfig.soundEnabled);
      await savePomodoroConfig(newConfig);

      if (status === "IDLE") {
        const dur = getDurationForMode(mode, newConfig);
        setTimeLeft(dur);
        setTotalDuration(dur);
      }
    },
    [status, mode, getDurationForMode],
  );

  const toggleChecklistItem = useCallback((itemId: string) => {
    setActiveTask((prev) => {
      if (!prev || !prev.checklists) return prev;
      return {
        ...prev,
        checklists: prev.checklists.map((c) =>
          c.id === itemId ? { ...c, completed: !c.completed } : c,
        ),
      };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const updatedConfig = { ...config, soundEnabled: !next };
      setConfig(updatedConfig);
      savePomodoroConfig(updatedConfig);
      return next;
    });
  }, [config]);

  const toggleFullscreen = useCallback(() => {
    if (!document) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // -----------------------------------------------------------
  // Ambient Sound Handlers
  // -----------------------------------------------------------
  const selectAmbientTrack = useCallback(
    (trackId: AmbientTrackId, explicitUrl?: string) => {
      setAmbientTrack(trackId);

      let urlToUse = explicitUrl;
      if (!urlToUse && trackId.startsWith("custom_")) {
        const found = customTracks.find((t) => t.id === trackId);
        urlToUse = found?.url;
      }

      ambientAudio.setTrack(trackId, urlToUse);

      if (trackId !== "none" && (status === "RUNNING" || isAmbientPlaying)) {
        ambientAudio.play();
        setIsAmbientPlaying(true);
      } else if (trackId === "none") {
        ambientAudio.stop();
        setIsAmbientPlaying(false);
      }

      try {
        localStorage.setItem(
          AMBIENT_STORAGE_KEY,
          JSON.stringify({
            track: trackId,
            volume: ambientVolume,
            autoPlay: autoPlayAmbient,
          }),
        );
      } catch {
        // ignore
      }
    },
    [status, isAmbientPlaying, ambientVolume, autoPlayAmbient, customTracks],
  );

  const toggleAmbientPlay = useCallback(() => {
    if (isAmbientPlaying) {
      ambientAudio.pause();
      setIsAmbientPlaying(false);
    } else {
      ambientAudio.play();
      setIsAmbientPlaying(true);
    }
  }, [isAmbientPlaying]);

  const changeAmbientVolume = useCallback(
    (vol: number) => {
      setAmbientVolume(vol);
      ambientAudio.setVolume(vol);
      try {
        localStorage.setItem(
          AMBIENT_STORAGE_KEY,
          JSON.stringify({
            track: ambientTrack,
            volume: vol,
            autoPlay: autoPlayAmbient,
          }),
        );
      } catch {
        // ignore
      }
    },
    [ambientTrack, autoPlayAmbient],
  );

  const toggleAutoPlayAmbient = useCallback(
    (enabled: boolean) => {
      setAutoPlayAmbient(enabled);
      try {
        localStorage.setItem(
          AMBIENT_STORAGE_KEY,
          JSON.stringify({
            track: ambientTrack,
            volume: ambientVolume,
            autoPlay: enabled,
          }),
        );
      } catch {
        // ignore
      }
    },
    [ambientTrack, ambientVolume],
  );

  const uploadCustomTrack = useCallback(
    async (file: File): Promise<CustomTrackRecord> => {
      const saved = await saveCustomAudioTrack(file);
      setCustomTracks((prev) => [saved, ...prev]);
      selectAmbientTrack(saved.id, saved.url);
      return saved;
    },
    [selectAmbientTrack],
  );

  const removeCustomTrack = useCallback(
    async (id: string) => {
      await deleteCustomAudioTrack(id);
      setCustomTracks((prev) => prev.filter((t) => t.id !== id));
      if (ambientTrack === id) {
        selectAmbientTrack("none");
      }
    },
    [ambientTrack, selectAmbientTrack],
  );

  return {
    mode,
    status,
    timeLeft,
    totalDuration,
    cycleCount,
    activeTask,
    config,
    notes,
    isMuted,
    isFullscreen,
    isInterruptionOpen,
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
    toggleChecklistItem,
    toggleSound,
    toggleFullscreen,
    updateConfig,
    setIsInterruptionOpen,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    uploadCustomTrack,
    removeCustomTrack,
  };
}
