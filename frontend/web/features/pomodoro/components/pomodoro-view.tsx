"use client";

import React from "react";
import { toast } from "sonner";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";
import { PomodoroControls } from "./pomodoro-controls";
import { PomodoroAmbientPlayer } from "./pomodoro-ambient-player";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { PomodoroReport } from "./pomodoro-report";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useOpenUserSettings } from "@/features/user-setting/hooks/use-open-user-settings";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { useAppSelector } from "@/store/store";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";
import { LoadingState } from "@/components/ui/loading-state";
import { PomodoroSyncStatus } from "./pomodoro-sync-status";

export function PomodoroView() {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <UserPomodoroView key={userId} /> : null;
}

function UserPomodoroView() {
  const {
    isReady,
    syncStatus,
    retrySync,
    configLoadError,
    sessionRevision,
    completionStatus,
    retryCompletion,
    cycleCount,
    mode,
    status,
    timeLeft,
    totalDuration,
    activeTask,
    selectFocusTask,
    config,
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
    requestSessionAction,
    stopSession,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    busy,
  } = usePomodoroSession();

  const openSettings = useOpenUserSettings();

  return (
    <div className="@container/pomodoro relative w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* Top Header & Context Bar */}
      <div className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-page-title font-semibold tracking-tight text-foreground">
              Pomodoro Focus
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            A space for deep focus, a steady work rhythm and fewer distractions.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {openSettings && <Button type="button" variant="outline" size="sm" className="h-10 gap-2 rounded-control px-3" onClick={() => openSettings(UserSettingTab.POMODORO)}>
            <Settings aria-hidden="true" className="size-3.5" />{copy.settings}
          </Button>}

        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <section aria-label="Pomodoro timer" className="mx-auto flex w-full min-w-0 max-w-3xl flex-col items-center gap-4">
          <PomodoroTimerDisplay
            mode={mode} status={status} completionStatus={completionStatus} cycleCount={cycleCount}
            longBreakInterval={config.longBreakInterval} disabled={!isReady || busy}
            timeLeft={timeLeft} totalDuration={totalDuration} focusDuration={config.focusDuration}
            shortBreakDuration={config.shortBreak} longBreakDuration={config.longBreak}
            activeTaskTitle={activeTask?.title} activeTaskNote={activeTask?.description}
            canClearTask={isReady && !busy && status === "IDLE"} onClearTask={() => void selectFocusTask(null)}
            onSwitchMode={nextMode => requestSessionAction({ type: "mode", mode: nextMode })}
          />
          <PomodoroControls disabled={!isReady || busy} status={status} mode={mode}
            onStart={start} onPause={pause} onResume={resume}
            onReset={() => requestSessionAction({ type: "reset" })}
            onSkip={() => requestSessionAction({ type: "skip" })}
            onStop={() => void stopSession().catch(error => toast.error(error instanceof Error ? error.message : copy.stopFailed))}
          />
          {!isReady && <LoadingState label="Loading Pomodoro..." className="text-xs text-warning-content" />}
          {isReady && busy && <LoadingState label={copy.savingAction} className="text-xs" />}
          {isReady && <PomodoroSyncStatus status={syncStatus} settingsPending={configLoadError} onRetry={retrySync} />}
          {isReady && status === "RUNNING" && timeLeft === 0 && <div className="text-center text-xs text-muted-foreground">
            <p>{copy.pendingHelp}</p>
            {completionStatus === "error" && <Button type="button" variant="link" onClick={() => void retryCompletion()}>{copy.retry}</Button>}
          </div>}
          {/* Ambient Music & Focus Sound Capsule */}
          <div className="w-full flex justify-center">
            <PomodoroAmbientPlayer
              currentTrackId={ambientTrack}
              isPlaying={isAmbientPlaying}
              volume={ambientVolume}
              autoPlayOnFocus={autoPlayAmbient}
              audios={audios}
              isLibraryLoading={isAudioLibraryLoading}
              hasLibraryError={hasAudioLibraryError}
              onRetryLibrary={retryAudioLibrary}
              disabled={!isAmbientReady}
              isTrackUnavailable={isTrackUnavailable}
              onSelectTrack={selectAmbientTrack}
              onTogglePlay={toggleAmbientPlay}
              onChangeVolume={changeAmbientVolume}
              onToggleAutoPlay={toggleAutoPlayAmbient}
            />
          </div>
          {!isAmbientReady ? (
            <LoadingState label="Loading audio preferences..." className="text-xs text-muted-foreground" />
          ) : ambientSyncStatus === "error" ? (
            <p role="status" className="text-center text-xs text-warning-content">Audio preferences are saved locally. Account sync will retry automatically.</p>
          ) : ambientSyncStatus === "saving" ? (
            <LoadingState label="Saving audio preferences..." className="text-xs text-muted-foreground" />
          ) : null}
          {hasPlaybackError && (
            <p role="status" className="text-center text-xs text-warning-content">{POMODORO_AUDIO_MESSAGES.playError}</p>
          )}
          {isTrackUnavailable && (
            <p role="status" className="text-center text-xs text-warning-content">{POMODORO_AUDIO_MESSAGES.unavailable}</p>
          )}
        </section>
        {isReady && <PomodoroActiveTaskCard twoColumns />}
        <div className="space-y-6">
          <PomodoroStatsOverview lastUpdated={sessionRevision} dailyGoalPomodoros={config.dailyGoalPomodoros} />
          <PomodoroReport lastUpdated={sessionRevision} />
        </div>
      </div>
    </div>
  );
}
