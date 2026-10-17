"use client";

import React from "react";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import { cn } from "@/lib/utils";
import { Target, StickyNote } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { POMODORO_MODES, POMODORO_MODE_THEMES } from "../constants/pomodoro-mode-theme";

interface PomodoroTimerDisplayProps {
  mode: PomodoroMode;
  status: PomodoroStatus;
  timeLeft: number;
  totalDuration: number;
  focusDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  activeTaskTitle?: string;
  activeTaskNote?: string;
  onSwitchMode: (mode: PomodoroMode) => void;
}

export function PomodoroTimerDisplay({
  mode,
  status,
  timeLeft,
  totalDuration,
  focusDuration = 25,
  shortBreakDuration = 5,
  longBreakDuration = 15,
  activeTaskTitle,
  activeTaskNote,
  onSwitchMode,
}: PomodoroTimerDisplayProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  // Visual Tokens & Themes by Mode
  const safeMode: PomodoroMode =
    mode && POMODORO_MODES.includes(mode)
      ? mode
      : "FOCUS";

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

  const dialSize = 360;
  const center = dialSize / 2;
  const radius = 150;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  const isRunning = status === "RUNNING";
  const cleanedTaskNote = cleanTaskDescription(activeTaskNote);

  const statusText = isRunning
    ? safeMode === "FOCUS"
      ? "Focusing"
      : "Taking a break"
    : status === "PAUSED"
      ? "Paused"
      : "Ready to start";

  const modeThemes = POMODORO_MODE_THEMES[safeMode];
  const ModeIcon = modeThemes.icon;
  const modeDurations: Record<PomodoroMode, number> = {
    FOCUS: focusDuration,
    SHORT_BREAK: shortBreakDuration,
    LONG_BREAK: longBreakDuration,
  };

  return (
    <Tabs
      value={safeMode}
      activationMode="manual"
      onValueChange={(value) => {
        const nextMode = POMODORO_MODES.find((candidate) => candidate === value);
        if (nextMode) onSwitchMode(nextMode);
      }}
      className="relative flex w-full min-w-0 flex-col items-center justify-center gap-0 select-none"
    >


      {/* Segmented Mode Selector */}
      <TabsList aria-label="Timer mode"
        className="grid h-auto w-full max-w-lg grid-cols-3 gap-1 rounded-panel border border-border bg-muted p-1">
        {POMODORO_MODES.map((tabMode) => {
          const theme = POMODORO_MODE_THEMES[tabMode];
          const TabIcon = theme.icon;
          return (
            <TabsTrigger key={tabMode} value={tabMode}
              className={cn(
                "flex h-auto min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-control px-1 py-2 text-xs font-medium tracking-tight text-muted-foreground transition-colors duration-200 hover:bg-card hover:text-foreground focus-visible:ring-2 data-[state=active]:bg-card data-[state=active]:font-semibold sm:text-xs",
                theme.tabClass,
              )}>
              <TabIcon aria-hidden="true" className="size-3.5" />
              <span>{theme.name}<span className="block text-xs opacity-70">{modeDurations[tabMode]}m</span></span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value={safeMode} forceMount className="flex w-full min-w-0 flex-col items-center">
      <div className="relative my-3 flex w-full max-w-[300px] items-center justify-center sm:max-w-[320px]">
        <div className="relative flex w-full aspect-square items-center justify-center rounded-full bg-card">
          {/* SVG Progress Circle */}
          <svg width={dialSize} height={dialSize} viewBox={`0 0 ${dialSize} ${dialSize}`} className="pointer-events-none absolute inset-0 size-full -rotate-90" aria-hidden>
            <circle cx={center} cy={center} r={radius} stroke="var(--border)" strokeWidth="6" fill="none" />
            <circle cx={center} cy={center} r={radius} stroke={modeThemes.color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="none" className="transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none" />
          </svg>

          {/* Center Digital Display & Contoured Task Focus Zone */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-10 text-center">
            <div
              title={statusText}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-all",
                modeThemes.badgeClass,
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full transition-all",
                  isRunning
                    ? "animate-pulse bg-success ring-2 ring-success/80"
                    : status === "PAUSED"
                      ? "bg-warning ring-2 ring-warning/80"
                      : "bg-muted-foreground/70",
                )}
              />
              <ModeIcon className="size-3" />
              <span>{modeThemes.name}</span>
            </div>
            <div
              aria-label={formattedTime}
              className="my-3.5 text-[52px] leading-none font-semibold tracking-[-0.04em] text-foreground tabular-nums"
            >
              {formattedTime}
            </div>

            {/* 3. Lower Hemisphere: Frameless Active Task OR Idle Status */}
            {activeTaskTitle ? (
              <div
                role="status"
                aria-live="polite"
                className="relative flex w-full max-w-[196px] flex-col items-center"
              >
                {/* Hero Task Title with Accent Target Icon */}
                <div className="flex max-w-full items-center justify-center gap-1.5">
                  <Target
                    className="size-3.5 shrink-0"
                    style={{ color: modeThemes.color }}
                  />
                  <strong
                    className="truncate text-[15px] font-semibold tracking-tight leading-snug text-foreground"
                    title={activeTaskTitle}
                  >
                    {activeTaskTitle}
                  </strong>
                </div>

                {/* Quiet Frameless Note Subtitle + Frosted Popover when truncated */}
                {cleanedTaskNote &&
                  (() => {
                    const isNoteTruncated =
                      cleanedTaskNote.includes("\n") ||
                      cleanedTaskNote.length > 24;
                    return (
                      <div
                        tabIndex={isNoteTruncated ? 0 : undefined}
                        className="group/note-pill relative mt-1 flex max-w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                      >
                        <StickyNote
                          className="size-3 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="max-w-[164px] truncate leading-tight">
                          {cleanedTaskNote}
                        </span>

                        {isNoteTruncated && (
                          <div
                            role="tooltip"
                            className="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-2 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-panel border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-foreground opacity-0 transition-all duration-150 ease-out group-hover/note-pill:visible group-hover/note-pill:translate-y-0 group-hover/note-pill:opacity-100 group-focus-visible/note-pill:visible group-focus-visible/note-pill:translate-y-0 group-focus-visible/note-pill:opacity-100 shadow-panel"
                          >
                            <div className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card" />
                            <p className="whitespace-pre-wrap break-words">
                              {cleanedTaskNote}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground border border-border">
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-all",
                    isRunning
                      ? "animate-ping bg-success"
                      : status === "PAUSED"
                        ? "bg-warning"
                        : "bg-border",
                  )}
                />
                <span>{statusText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </TabsContent>
    </Tabs>
  );
}
