"use client";

import React from "react";
import { toast } from "sonner";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { usePomodoroViewMode } from "../hooks/use-pomodoro-view-mode";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";
import { PomodoroControls } from "./pomodoro-controls";
import { PomodoroAmbientPlayer } from "./pomodoro-ambient-player";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { PomodoroReport } from "./pomodoro-report";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Settings } from "lucide-react";
import { useOpenUserSettings } from "@/features/user-setting/hooks/use-open-user-settings";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";
import { LoadingState } from "@/components/ui/loading-state";

export function PomodoroView() {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <UserPomodoroView key={userId} userId={userId} /> : null;
}

function UserPomodoroView({ userId }: { userId: string }) {
  const {
    isReady,
    loadError,
    sessionRevision,
    completionStatus,
    retryCompletion,
    cycleCount,
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
    requestSessionAction,
    stopSession,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    busy,
  } = usePomodoroSession();

  const { viewMode, setViewMode } = usePomodoroViewMode(userId);
  const minimalMode = viewMode === "focus";
  const openSettings = useOpenUserSettings();

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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {openSettings && <Button type="button" variant="outline" size="sm" onClick={() => openSettings(UserSettingTab.POMODORO)}>
            <Settings aria-hidden="true" className="size-3.5" />{copy.settings}
          </Button>}
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
            : "mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 items-start gap-5 @min-[880px]/pomodoro:grid-cols-2 @min-[880px]/pomodoro:grid-rows-[auto_1fr] @min-[880px]/pomodoro:gap-x-8"
        }
      >
        {/* Left Column: Focus Studio Core */}
        <div
          className={
            minimalMode
              ? "flex min-w-0 flex-col items-center gap-4"
              : "flex min-w-0 flex-col items-center gap-4 @min-[880px]/pomodoro:col-start-1 @min-[880px]/pomodoro:row-start-1"
          }
        >
          {/* Precision Timer Display */}
          <div className="flex w-full min-w-0 justify-center">
            <PomodoroTimerDisplay
              mode={mode}
              status={status}
              completionStatus={completionStatus}
              cycleCount={cycleCount}
              longBreakInterval={config.longBreakInterval}
              disabled={!isReady || busy}
              timeLeft={timeLeft}
              totalDuration={totalDuration}
              focusDuration={config.focusDuration}
              shortBreakDuration={config.shortBreak}
              longBreakDuration={config.longBreak}
              activeTaskTitle={activeTask?.title}
              activeTaskNote={activeTask?.description}
              onSwitchMode={(nextMode) => requestSessionAction({ type: "mode", mode: nextMode })}
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
            onReset={() => requestSessionAction({ type: "reset" })}
            onSkip={() => requestSessionAction({ type: "skip" })}
            onStop={() => void stopSession().catch((error) => toast.error(error instanceof Error ? error.message : copy.stopFailed))}
          />
          {!isReady && (
            <LoadingState label="Loading Pomodoro..." className="text-xs text-warning-content" />
          )}
          {isReady && busy && <LoadingState label={copy.savingAction} className="text-xs" />}
          {isReady && loadError && (
            <p role="status" className="text-xs text-warning-content">
              Using local data. Sync will resume automatically when Calendar is available again.
            </p>
          )}
          {isReady && status === "RUNNING" && timeLeft === 0 && (
            <div className="text-center text-xs text-muted-foreground">
              <p>{copy.pendingHelp}</p>
              {completionStatus === "error" && <Button type="button" variant="link" onClick={() => void retryCompletion()}>{copy.retry}</Button>}
            </div>
          )}

        </div>

        <div className={cn("flex min-w-0 flex-col gap-5",
          !minimalMode && "@min-[880px]/pomodoro:col-start-2 @min-[880px]/pomodoro:row-start-1 @min-[880px]/pomodoro:row-span-2",
        )}>
          {isReady && <fieldset disabled={busy} className="flex w-full min-w-0 justify-center [&>div]:max-w-none">
            <PomodoroActiveTaskCard compact={minimalMode} />
          </fieldset>}
          {!minimalMode && <PomodoroStatsOverview lastUpdated={sessionRevision} dailyGoalPomodoros={config.dailyGoalPomodoros} />}
        </div>

        <div className={cn("flex min-w-0 flex-col items-center gap-3", !minimalMode && "@min-[880px]/pomodoro:col-start-1 @min-[880px]/pomodoro:row-start-2")}>
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
        </div>

      </div>

      <div hidden={minimalMode} className="mt-8 min-w-0 border-t border-border/80 pt-6">
        <PomodoroReport lastUpdated={sessionRevision} />
      </div>

    </div>
  );
}
