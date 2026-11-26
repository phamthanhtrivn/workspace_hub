"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Maximize2,
  Minimize2,
  Settings,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { DialogPortal } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";
import { PomodoroControls } from "./pomodoro-controls";
import { PomodoroAmbientPlayer } from "./pomodoro-ambient-player";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { PomodoroReport } from "./pomodoro-report";
import { Button } from "@/components/ui/button";
import { useOpenUserSettings } from "@/features/user-setting/hooks/use-open-user-settings";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { POMODORO_MODE_THEMES } from "../constants/pomodoro-mode-theme";
import { MAX_POMODORO_NOTES_LENGTH } from "../utils/pomodoro-notes";
import { useAppSelector } from "@/store/store";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";
import { LoadingState } from "@/components/ui/loading-state";
import { PomodoroSyncStatus } from "./pomodoro-sync-status";
import { cn } from "@/lib/utils";

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
    notes,
    setNotes,
    busy,
  } = usePomodoroSession();

  const openSettings = useOpenUserSettings();
  const [isZenMode, setIsZenMode] = useState(false);
  const modeTheme = POMODORO_MODE_THEMES[mode] ?? POMODORO_MODE_THEMES.FOCUS;

  useEffect(() => {
    if (!isZenMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      setIsZenMode(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZenMode]);

  const timerCardContent = (
    <>
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
        canClearTask={isReady && !busy && status === "IDLE"}
        onClearTask={() => void selectFocusTask(null)}
        onSwitchMode={(nextMode) =>
          requestSessionAction({ type: "mode", mode: nextMode })
        }
        zenMode={isZenMode}
      />
      <div className="mt-2 flex w-full flex-col items-center gap-3">
        <PomodoroControls
          disabled={!isReady || busy}
          status={status}
          mode={mode}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onReset={() => requestSessionAction({ type: "reset" })}
          onSkip={() => requestSessionAction({ type: "skip" })}
          onStop={() =>
            void stopSession().catch((error) =>
              toast.error(
                error instanceof Error ? error.message : copy.stopFailed,
              ),
            )
          }
        />
        {!isReady && (
          <LoadingState
            label="Loading Pomodoro..."
            className="text-xs text-warning-content"
          />
        )}
        {isReady && busy && (
          <LoadingState label={copy.savingAction} className="text-xs" />
        )}
        {isReady && (
          <PomodoroSyncStatus
            status={syncStatus}
            settingsPending={configLoadError}
            onRetry={retrySync}
          />
        )}
        {isReady && status === "RUNNING" && timeLeft === 0 && (
          <div className="text-center text-xs text-muted-foreground">
            <p>{copy.pendingHelp}</p>
            {completionStatus === "error" && (
              <Button
                type="button"
                variant="link"
                onClick={() => void retryCompletion()}
              >
                {copy.retry}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto w-full space-y-4 border-t border-border pt-6">
        {isReady && status !== "IDLE" && (
          <div className="w-full rounded-panel border border-border bg-muted/20 p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <label
                htmlFor="pomodoro-session-notes"
                className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-control bg-info-soft text-info-content">
                  <StickyNote aria-hidden="true" className="size-3.5" />
                </span>
                <span className="truncate">Session notes</span>
              </label>
              <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {Array.from(notes).length}/{MAX_POMODORO_NOTES_LENGTH}
              </span>
            </div>
            <Textarea
              id="pomodoro-session-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Capture key takeaways, blockers, or context for this session..."
              maxLength={MAX_POMODORO_NOTES_LENGTH}
              rows={3}
              disabled={busy}
              className="min-h-[88px] resize-y bg-card text-xs leading-relaxed"
            />
          </div>
        )}

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
        {!isAmbientReady ? (
          <LoadingState
            label="Loading audio preferences..."
            className="mt-2 justify-center text-xs text-muted-foreground"
          />
        ) : ambientSyncStatus === "error" ? (
          <p
            role="status"
            className="mt-2 text-center text-xs text-warning-content"
          >
            Audio preferences are saved locally. Account sync will retry
            automatically.
          </p>
        ) : ambientSyncStatus === "saving" ? (
          <LoadingState
            label="Saving audio preferences..."
            className="mt-2 justify-center text-xs text-muted-foreground"
          />
        ) : null}
        {hasPlaybackError && (
          <p
            role="status"
            className="mt-2 text-center text-xs text-warning-content"
          >
            {POMODORO_AUDIO_MESSAGES.playError}
          </p>
        )}
        {isTrackUnavailable && (
          <p
            role="status"
            className="mt-2 text-center text-xs text-warning-content"
          >
            {POMODORO_AUDIO_MESSAGES.unavailable}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-full w-full min-w-0 bg-background text-foreground">
      <div className="@container/pomodoro relative w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-6 flex w-full min-w-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0 flex-1 basis-64">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-page-title font-semibold tracking-tight text-foreground">
                Pomodoro Focus
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                  modeTheme.badgeClass,
                )}
              >
                <Sparkles aria-hidden="true" className="size-3" />
                {modeTheme.badgeLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A space for deep focus, a steady work rhythm and fewer
              distractions.
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {openSettings && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-control px-3 text-xs font-semibold"
                onClick={() => openSettings(UserSettingTab.POMODORO)}
              >
                <Settings
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
                {copy.settings}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-9 rounded-control"
              aria-label="Enter Zen Mode"
              title="Enter distraction-free Zen Mode"
              onClick={() => setIsZenMode(true)}
            >
              <Maximize2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </header>

        <div className="w-full min-w-0 space-y-6">
          <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 @min-[64rem]/pomodoro:grid-cols-12 @min-[64rem]/pomodoro:items-stretch">
            <section
              aria-label="Pomodoro timer"
              className="flex h-full w-full min-w-0 flex-col items-center gap-6 rounded-panel border border-border bg-card p-5 sm:p-8 @min-[64rem]/pomodoro:col-span-7"
            >
              {!isZenMode && timerCardContent}
            </section>

            <aside className="flex h-full min-w-0 flex-col gap-6 @min-[64rem]/pomodoro:col-span-5">
              <PomodoroStatsOverview
                lastUpdated={sessionRevision}
                dailyGoalPomodoros={config.dailyGoalPomodoros}
              />
              {isReady && <PomodoroActiveTaskCard />}
            </aside>
          </div>

          <PomodoroReport lastUpdated={sessionRevision} />
        </div>
      </div>

      {isZenMode && (
        <DialogPortal>
          <div
            role="region"
            aria-label="Zen Mode"
            className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-background text-foreground"
          >
            <div className="flex shrink-0 items-center justify-end px-4 pt-4 sm:px-6 sm:pt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-control px-3.5 text-xs font-semibold"
                onClick={() => setIsZenMode(false)}
              >
                <Minimize2 aria-hidden="true" className="size-3.5" />
                Exit Zen Mode
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
              <section
                aria-label="Pomodoro timer"
                className="flex w-full max-w-2xl flex-col items-center gap-6 rounded-panel border border-border bg-card p-6 sm:p-8"
              >
                {timerCardContent}
              </section>
            </div>
          </div>
        </DialogPortal>
      )}
    </div>
  );
}
