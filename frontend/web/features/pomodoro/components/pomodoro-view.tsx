"use client";

import React, { useCallback } from "react";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { usePomodoroViewMode } from "../hooks/use-pomodoro-view-mode";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";
import { PomodoroControls } from "./pomodoro-controls";
import { PomodoroAmbientPlayer } from "./pomodoro-ambient-player";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { PomodoroReport } from "./pomodoro-report";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";

export function PomodoroView() {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <UserPomodoroView key={userId} userId={userId} /> : null;
}

function UserPomodoroView({ userId }: { userId: string }) {
  const {
    isReady,
    loadError,
    sessionRevision,
    isTaskActionPending,
    mode,
    status,
    timeLeft,
    totalDuration,
    activeTask,
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
    reset,
    skip,
    switchMode,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    busy,
  } = usePomodoroSession();

  const { viewMode, setViewMode } = usePomodoroViewMode(userId);
  const minimalMode = viewMode === "focus";
  const handleReset = useCallback(() => reset(), [reset]);
  const handleSkip = useCallback(() => skip(), [skip]);

  return (
    <div className="@container/pomodoro relative w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* Top Header & Context Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
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

        <div className="ml-auto flex items-center gap-2">
          {/* Minimal Focus View Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewMode(minimalMode ? "full" : "focus")}
            aria-pressed={minimalMode}
            className={cn(
              "rounded-full border-border text-xs font-semibold transition-all h-9 px-4",
              minimalMode
                ? "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground border-transparent"
                : "text-foreground hover:text-foreground bg-card hover:bg-background",
            )}
          >
            {minimalMode ? (
              <>
                <Eye className="size-3.5 mr-1.5" /> Full view
              </>
            ) : (
              <>
                <EyeOff className="size-3.5 mr-1.5" /> Deep focus
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div
        className={
          minimalMode
            ? "mx-auto grid max-w-xl grid-cols-1 items-start gap-5"
            : "grid min-w-0 grid-cols-1 items-start gap-5 @min-[880px]/pomodoro:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @min-[880px]/pomodoro:gap-x-8"
        }
      >
        {/* Left Column: Focus Studio Core */}
        <div
          className={
            minimalMode
              ? "flex min-w-0 flex-col items-center gap-4"
              : "flex min-w-0 flex-col items-center gap-4 @min-[880px]/pomodoro:col-start-1 @min-[880px]/pomodoro:row-span-2 @min-[880px]/pomodoro:row-start-1"
          }
        >
          {/* Precision Timer Display */}
          <div className="flex w-full min-w-0 justify-center">
            <PomodoroTimerDisplay
              mode={mode}
              status={status}
              timeLeft={timeLeft}
              totalDuration={totalDuration}
              focusDuration={config.focusDuration}
              shortBreakDuration={config.shortBreak}
              longBreakDuration={config.longBreak}
              activeTaskTitle={activeTask?.title}
              activeTaskNote={activeTask?.description}
              onSwitchMode={switchMode}
            />
          </div>

          {/* Controls Dock */}
          <PomodoroControls
            disabled={!isReady || busy}
            status={status}
            mode={mode}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onReset={handleReset}
            onSkip={handleSkip}
          />
          {!isReady && (
            <p
              role="status"
              className="text-xs text-warning-content"
            >
              Loading Pomodoro...
            </p>
          )}
          {isReady && loadError && (
            <p role="status" className="text-xs text-warning-content">
              Using local data. Sync will resume automatically when Calendar is available again.
            </p>
          )}
          {isReady && status === "RUNNING" && timeLeft === 0 && (
            <p role="status" className="text-xs text-muted-foreground">
              Saving your completed session. The system will retry if the connection is interrupted.
            </p>
          )}

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
            <p role="status" className="text-xs text-muted-foreground">Loading audio preferences...</p>
          ) : ambientSyncStatus === "error" ? (
            <p role="status" className="text-center text-xs text-warning-content">Audio preferences are saved locally. Account sync will retry automatically.</p>
          ) : ambientSyncStatus === "saving" ? (
            <p role="status" className="text-xs text-muted-foreground">Saving audio preferences...</p>
          ) : null}
          {hasPlaybackError && (
            <p role="status" className="text-center text-xs text-warning-content">{POMODORO_AUDIO_MESSAGES.playError}</p>
          )}
          {isTrackUnavailable && (
            <p role="status" className="text-center text-xs text-warning-content">{POMODORO_AUDIO_MESSAGES.unavailable}</p>
          )}
        </div>

        {/* Active Focus Target Card */}
        {isReady && (
          <fieldset disabled={isTaskActionPending} className={cn(
            "flex w-full min-w-0 justify-center [&>div]:max-w-none",
            !minimalMode && "@min-[880px]/pomodoro:col-start-2 @min-[880px]/pomodoro:row-start-1",
          )}>
            <PomodoroActiveTaskCard />
          </fieldset>
        )}

        {/* Supporting stats sit below the active task. */}
        {!minimalMode && (
          <div className="min-w-0 @min-[880px]/pomodoro:col-start-2 @min-[880px]/pomodoro:row-start-2">
            <PomodoroStatsOverview lastUpdated={sessionRevision} dailyGoalPomodoros={config.dailyGoalPomodoros} />
          </div>
        )}
      </div>

      <div hidden={minimalMode} className="mt-8 min-w-0 border-t border-border/80 pt-6">
        <PomodoroReport lastUpdated={sessionRevision} />
      </div>

    </div>
  );
}
