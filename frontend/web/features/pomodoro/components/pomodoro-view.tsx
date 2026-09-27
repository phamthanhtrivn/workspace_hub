"use client";

import React, { useState } from "react";
import { usePomodoroTimer } from "../hooks/use-pomodoro-timer";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";
import { PomodoroControls } from "./pomodoro-controls";
import { PomodoroAmbientPlayer } from "./pomodoro-ambient-player";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { PomodoroTaskPickerDialog } from "./pomodoro-task-picker-dialog";
import { PomodoroSettingsDialog } from "./pomodoro-settings-dialog";
import { PomodoroInterruptionDialog } from "./pomodoro-interruption-dialog";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { PomodoroSessionHistory } from "./pomodoro-session-history";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function PomodoroView() {
  const {
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
  } = usePomodoroTimer();

  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [minimalMode, setMinimalMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const handleResetWithRefresh = (reason?: string) => {
    reset(reason);
    setLastUpdated(Date.now());
  };

  const handleSkipWithRefresh = () => {
    skip();
    setLastUpdated(Date.now());
  };

  const handleAddChecklist = (title: string) => {
    if (!activeTask) return;
    const newItem = {
      id: `chk-${Date.now()}`,
      title,
      completed: false,
    };
    setActiveTask({
      ...activeTask,
      checklists: [...(activeTask.checklists || []), newItem],
    });
  };

  const handleDeleteChecklist = (itemId: string) => {
    if (!activeTask) return;
    setActiveTask({
      ...activeTask,
      checklists: (activeTask.checklists || []).filter((c) => c.id !== itemId),
    });
  };

  const handleInterruptionReason = (reason: string) => {
    handleResetWithRefresh(reason);
  };

  const isRunning = status === "RUNNING";

  return (
    <div className="relative min-h-[85vh] w-full max-w-6xl mx-auto py-3 px-1">
      {/* Dynamic Background Atmosphere Glow */}
      <div
        className={cn(
          "pointer-events-none fixed -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-[140px] transition-all duration-1000",
          mode === "FOCUS"
            ? "bg-blue-600/10"
            : mode === "SHORT_BREAK"
              ? "bg-teal-500/10"
              : "bg-sky-500/10",
          isRunning ? "opacity-100 scale-105" : "opacity-60",
        )}
      />

      {/* Top Header & Context Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-6">
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
            Không gian tập trung sâu, quản lý nhịp độ làm việc và triệt tiêu xao nhãng.
          </p>
        </div>

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
              <EyeOff className="size-3.5 mr-1.5" /> Chế độ Siêu tập trung (Zen)
            </>
          )}
        </Button>
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
              cycleCount={cycleCount}
              longBreakInterval={config.longBreakInterval || 4}
              onSwitchMode={switchMode}
            />
          </div>

          {/* Controls Dock */}
          <PomodoroControls
            status={status}
            mode={mode}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onReset={() => handleResetWithRefresh()}
            onSkip={handleSkipWithRefresh}
            onToggleSound={toggleSound}
            onToggleFullscreen={toggleFullscreen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenInterruption={() => setIsInterruptionOpen(true)}
          />

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
          <div className="w-full flex justify-center">
            <PomodoroActiveTaskCard
              activeTask={activeTask}
              notes={notes}
              onSelectTaskClick={() => setIsTaskPickerOpen(true)}
              onClearTask={() => setActiveTask(null)}
              onToggleChecklistItem={toggleChecklistItem}
              onAddChecklistItem={handleAddChecklist}
              onDeleteChecklistItem={handleDeleteChecklist}
              onNotesChange={setNotes}
              onSetCustomTask={setActiveTask}
              onUpdateActiveTask={setActiveTask}
            />
          </div>
        </div>

        {/* Right Column: Live Metrics & Session Log (Hidden in Minimal Mode) */}
        {!minimalMode && (
          <div className="lg:col-span-5 flex flex-col gap-6">
            <PomodoroStatsOverview lastUpdated={lastUpdated} />
            <PomodoroSessionHistory lastUpdated={lastUpdated} />
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      <PomodoroTaskPickerDialog
        isOpen={isTaskPickerOpen}
        onClose={() => setIsTaskPickerOpen(false)}
        onSelectTask={setActiveTask}
      />

      <PomodoroSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={updateConfig}
      />

      <PomodoroInterruptionDialog
        isOpen={isInterruptionOpen}
        onClose={() => setIsInterruptionOpen(false)}
        onSelectReason={handleInterruptionReason}
      />
    </div>
  );
}
