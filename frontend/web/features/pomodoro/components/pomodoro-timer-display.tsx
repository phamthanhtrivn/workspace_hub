"use client";

import React from "react";
import type {
  PomodoroCompletionStatus,
  PomodoroMode,
  PomodoroStatus,
} from "../types/pomodoro";
import { getPomodoroCycleContext } from "../utils/pomodoro-cycle";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import { cn } from "@/lib/utils";
import { Target, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  POMODORO_MODES,
  POMODORO_MODE_THEMES,
} from "../constants/pomodoro-mode-theme";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface PomodoroTimerDisplayProps {
  mode: PomodoroMode;
  status: PomodoroStatus;
  completionStatus?: PomodoroCompletionStatus;
  cycleCount?: number;
  longBreakInterval?: number;
  disabled?: boolean;
  timeLeft: number;
  totalDuration: number;
  focusDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  activeTaskTitle?: string;
  activeTaskNote?: string;
  canClearTask?: boolean;
  onClearTask?: () => void;
  onSwitchMode: (mode: PomodoroMode) => void;
  zenMode?: boolean;
}

export function PomodoroTimerDisplay({
  mode,
  status,
  completionStatus = "idle",
  cycleCount = 0,
  longBreakInterval = 2,
  disabled = false,
  timeLeft,
  totalDuration,
  focusDuration = 25,
  shortBreakDuration = 5,
  longBreakDuration = 15,
  activeTaskTitle,
  activeTaskNote,
  canClearTask = false,
  onClearTask,
  onSwitchMode,
  zenMode = false,
}: PomodoroTimerDisplayProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  // Visual Tokens & Themes by Mode
  const safeMode: PomodoroMode =
    mode && POMODORO_MODES.includes(mode) ? mode : "FOCUS";

  const effectiveTotal =
    totalDuration > 0
      ? totalDuration
      : safeMode === "FOCUS"
        ? 25 * 60
        : safeMode === "SHORT_BREAK"
          ? 5 * 60
          : 15 * 60;

  const progressPercent = Math.max(
    0,
    Math.min(100, ((effectiveTotal - timeLeft) / effectiveTotal) * 100),
  );

  const dialSize = zenMode ? 304 : 260;
  const center = dialSize / 2;
  const radius = zenMode ? 136 : 114;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  const finished = status === "RUNNING" && timeLeft === 0;
  const isRunning = status === "RUNNING" && !finished;
  const cleanedTaskNote = cleanTaskDescription(activeTaskNote);
  const modeThemes = POMODORO_MODE_THEMES[safeMode];

  const statusText = finished
    ? completionStatus === "error"
      ? copy.waiting
      : copy.saving
    : isRunning
      ? modeThemes.runningHint
      : status === "PAUSED"
        ? "Paused"
        : modeThemes.idleHint;
  const modeDurations: Record<PomodoroMode, number> = {
    FOCUS: focusDuration,
    SHORT_BREAK: shortBreakDuration,
    LONG_BREAK: longBreakDuration,
  };
  const cycle = getPomodoroCycleContext(
    safeMode,
    cycleCount,
    longBreakInterval,
  );

  return (
    <Tabs
      value={safeMode}
      activationMode="manual"
      onValueChange={(value) => {
        const nextMode = POMODORO_MODES.find(
          (candidate) => candidate === value,
        );
        if (nextMode) onSwitchMode(nextMode);
      }}
      className="relative flex w-full min-w-0 flex-col items-center justify-center gap-0 select-none"
    >
      {/* Segmented Mode Selector */}
      <TabsList
        aria-label="Timer mode"
        className="grid h-auto w-full max-w-md grid-cols-3 items-stretch gap-1 rounded-panel bg-muted p-1"
      >
        {POMODORO_MODES.map((tabMode) => {
          const theme = POMODORO_MODE_THEMES[tabMode];

          return (
            <TabsTrigger
              key={tabMode}
              value={tabMode}
              disabled={disabled}
              className={cn(
                "flex h-auto min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-control border border-transparent px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:text-foreground focus-visible:ring-inset data-[state=active]:shadow-2xs motion-reduce:transition-none sm:text-[13px]",
                theme.tabClass,
              )}
            >
              <span className="truncate">
                {theme.name} ({modeDurations[tabMode]}m)
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Active Task Pill Banner */}
      <div
        className={cn(
          "mt-4 flex w-full max-w-md items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-xs transition-colors",
          modeThemes.bannerClass,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Target aria-hidden="true" className="size-4 shrink-0" />
          <span className="shrink-0 font-medium opacity-75">Focusing on:</span>
          <strong
            className="truncate font-bold"
            title={activeTaskTitle || "Free focus"}
          >
            {activeTaskTitle || "Free focus (no task selected)"}
          </strong>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {cleanedTaskNote &&
            (() => {
              const isNoteTruncated =
                cleanedTaskNote.includes("\n") || cleanedTaskNote.length > 24;

              return (
                <Tooltip disabled={!isNoteTruncated}>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={isNoteTruncated ? 0 : undefined}
                      className="inline-flex items-center gap-1 rounded-md bg-card/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      title={cleanedTaskNote}
                    >
                      <StickyNote
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="max-w-20 truncate">
                        {cleanedTaskNote}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-left leading-relaxed">
                    <p className="whitespace-pre-wrap break-words">
                      {cleanedTaskNote}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })()}
          {activeTaskTitle && onClearTask && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canClearTask}
              onClick={onClearTask}
              aria-label="Clear selected task"
              title="Clear selected task"
              className="size-6 shrink-0 rounded-full p-0 text-current opacity-70 hover:opacity-100"
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <TabsContent
        value={safeMode}
        forceMount
        className="flex w-full min-w-0 flex-col items-center"
      >
        <div
          className={cn(
            "@container/timer relative my-6 flex min-w-0 w-full items-center justify-center",
            zenMode ? "max-w-72 sm:max-w-80" : "max-w-64 sm:max-w-72",
          )}
        >
          <div className="relative flex aspect-square w-full items-center justify-center rounded-full bg-card">
            <svg
              width={dialSize}
              height={dialSize}
              viewBox={`0 0 ${dialSize} ${dialSize}`}
              className="pointer-events-none absolute inset-0 size-full -rotate-90"
              aria-hidden
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={modeThemes.trackColor}
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={modeThemes.color}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-[stroke-dashoffset,stroke] duration-300 ease-linear motion-reduce:transition-none"
              />
            </svg>

            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
              <div
                title={statusText}
                className={cn(
                  "mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors motion-reduce:transition-none",
                  modeThemes.badgeClass,
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-colors motion-reduce:transition-none",
                    isRunning
                      ? "bg-success-content ring-2 ring-success-outline/80 motion-safe:animate-pulse"
                      : status === "PAUSED"
                        ? "bg-warning-content ring-2 ring-warning-outline/80"
                        : "bg-muted-foreground/70",
                  )}
                />
                <span>
                  Session {Math.min(cycle.focusNumber, cycle.interval)} of{" "}
                  {cycle.interval}
                </span>
              </div>

              <div
                aria-label={formattedTime}
                className={cn(
                  "font-bold tracking-tight text-foreground tabular-nums",
                  zenMode ? "text-6xl sm:text-7xl" : "text-5xl sm:text-6xl",
                )}
              >
                {formattedTime}
              </div>

              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className={cn(
                  "mt-2 text-xs font-medium text-muted-foreground",
                  finished && "text-warning-content",
                )}
              >
                {statusText}
              </p>
            </div>
          </div>
        </div>

        {/* Cycle Dots Progress */}
        <div className="mb-5 flex w-full items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
          <span className="font-medium">
            {copy.cycle(
              cycle.focusNumber,
              cycle.interval,
              POMODORO_MODE_THEMES[cycle.nextMode].name,
              modeDurations[cycle.nextMode],
            )}
          </span>
          <div
            className="flex shrink-0 items-center gap-1.5"
            aria-hidden="true"
          >
            {Array.from({ length: cycle.interval }).map((_, i) => {
              const done = i < cycleCount % cycle.interval;
              const current =
                i === cycleCount % cycle.interval && safeMode === "FOCUS";

              return (
                <span
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    done
                      ? "w-5 bg-wsh-primary"
                      : current
                        ? "w-5 bg-wsh-accent ring-2 ring-wsh-ice"
                        : "w-2 bg-border",
                  )}
                />
              );
            })}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
