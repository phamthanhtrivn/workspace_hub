"use client";

import React, { useCallback, useState } from "react";
import { usePomodoroTimer } from "../hooks/use-pomodoro-timer";
import { usePomodoroTaskActions } from "../hooks/use-pomodoro-task-actions";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";
import { PomodoroControls } from "./pomodoro-controls";
import { PomodoroAmbientPlayer } from "./pomodoro-ambient-player";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { PomodoroSettingsDialog } from "./pomodoro-settings-dialog";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { PomodoroReport } from "./pomodoro-report";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";

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
    setNotes,
    updateConfig,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    uploadCustomTrack,
    removeCustomTrack,
  } = usePomodoroTimer(userId);
  const { runTaskAction, taskRevision } = usePomodoroTaskActions(finishActiveTask);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [minimalMode, setMinimalMode] = useState(false);
  const isRunning = status === "RUNNING";
  const handleReset = useCallback(() => reset(), [reset]);
  const handleSkip = useCallback(() => skip(), [skip]);
  const handleClearTask = useCallback(() => { void selectTask(null); }, [selectTask]);

  return (
    <div className="relative min-h-[85vh] w-full max-w-6xl mx-auto py-3 px-1">
      {/* Dynamic Background Atmosphere Glow */}
      <div
        className={cn(
          "pointer-events-none fixed -top-40 left-1/2 -z-10 h-[600px] w-[90%] max-w-[900px] -translate-x-1/2 rounded-full blur-[140px] transition-all duration-1000",
          mode === "FOCUS"
            ? "bg-blue-600/10"
            : mode === "SHORT_BREAK"
              ? "bg-teal-500/10"
              : "bg-sky-500/10",
          isRunning ? "opacity-100 scale-105" : "opacity-60",
        )}
      />

      {/* Top Header & Context Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary-dark,#0F2854)]">
              Pomodoro Focus Hub
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary,#1C4D8D)] shadow-2xs">
              <Sparkles className="size-3" /> All-in-One Studio
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Không gian tập trung sâu, quản lý nhịp độ làm việc và triệt tiêu xao
            nhãng.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            disabled={!isReady || isTaskActionPending}
            title="Cài đặt Pomodoro"
            aria-label="Mở cài đặt Pomodoro"
            className="size-9 rounded-full border-slate-200 bg-white text-slate-600 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings className="size-4" />
          </Button>

          {/* Minimal Focus View Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMinimalMode(!minimalMode)}
            className={cn(
              "rounded-full border-slate-200 text-xs font-bold transition-all shadow-xs h-9 px-4",
              minimalMode
                ? "bg-[var(--color-primary,#1C4D8D)] text-white hover:bg-[var(--color-primary-strong,#0F2854)] hover:text-white border-transparent"
                : "text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50",
            )}
          >
            {minimalMode ? (
              <>
                <Eye className="size-3.5 mr-1.5" /> Chế độ đầy đủ
              </>
            ) : (
              <>
                <EyeOff className="size-3.5 mr-1.5" /> Chế độ Siêu tập trung
                (Zen)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div
        className={
          minimalMode
            ? "flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in-95 duration-300"
            : "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300"
        }
      >
        {/* Left Column: Focus Studio Core */}
        <div
          className={
            minimalMode
              ? "w-full max-w-xl flex flex-col items-center gap-6"
              : "lg:col-span-7 flex flex-col items-center gap-6"
          }
        >
          {/* Precision Timer Display */}
          <div className="w-full flex justify-center py-1">
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
            disabled={!isReady || isTaskActionPending || (status === "RUNNING" && timeLeft === 0)}
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
              className="text-xs text-amber-700"
            >
              Đang tải Pomodoro...
            </p>
          )}
          {isReady && loadError && (
            <p role="status" className="text-xs text-amber-700">
              Đang dùng dữ liệu cục bộ. Hệ thống sẽ tự đồng bộ khi Calendar hoạt động lại.
            </p>
          )}
          {isReady && status === "RUNNING" && timeLeft === 0 && (
            <p role="status" className="text-xs text-slate-500">
              Đang lưu phiên hoàn thành. Nếu mạng gián đoạn, hệ thống sẽ thử
              lại.
            </p>
          )}

          {/* Ambient Music & Focus Sound Capsule */}
          <div className="w-full flex justify-center">
            <PomodoroAmbientPlayer
              currentTrackId={ambientTrack}
              isPlaying={isAmbientPlaying}
              volume={ambientVolume}
              autoPlayOnFocus={autoPlayAmbient}
              customTracks={customTracks}
              onSelectTrack={selectAmbientTrack}
              onTogglePlay={toggleAmbientPlay}
              onChangeVolume={changeAmbientVolume}
              onToggleAutoPlay={toggleAutoPlayAmbient}
              onUploadTrack={uploadCustomTrack}
              onRemoveCustomTrack={removeCustomTrack}
            />
          </div>

          {/* Active Focus Target Card */}
          {isReady && (
            <fieldset disabled={isTaskActionPending} className="w-full min-w-0 flex justify-center">
              <PomodoroActiveTaskCard
                taskRevision={taskRevision}
                timerStatus={status}
                taskActionDisabled={isTaskActionPending || (status === "RUNNING" && timeLeft === 0)}
                onTaskAction={runTaskAction}
                activeTask={activeTask}
                notes={notes}
                onClearTask={handleClearTask}
                onNotesChange={setNotes}
                onSetCustomTask={selectTask}
                onUpdateActiveTask={updateActiveTask}
                focusDurationMinutes={config.focusDuration}
              />
            </fieldset>
          )}
        </div>

        {/* Right Column: Live Metrics & Session Log (Hidden in Minimal Mode) */}
        {!minimalMode && (
          <div className="lg:col-span-5 flex flex-col gap-6">
            <PomodoroStatsOverview lastUpdated={sessionRevision} dailyGoalPomodoros={config.dailyGoalPomodoros} />
            <PomodoroReport lastUpdated={sessionRevision} />
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      {isSettingsOpen && (
        <PomodoroSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSaveConfig={updateConfig}
        />
      )}
    </div>
  );
}
