"use client";

import React from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { POMODORO_MODE_THEMES } from "../constants/pomodoro-mode-theme";

interface PomodoroControlsProps {
  disabled: boolean;
  status: PomodoroStatus;
  mode: PomodoroMode;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const PomodoroControls = React.memo(function PomodoroControls({
  disabled,
  status,
  mode,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
}: PomodoroControlsProps) {
  const isRunning = status === "RUNNING";
  const isFocus = mode === "FOCUS";
  const modeTheme = POMODORO_MODE_THEMES[mode] ?? POMODORO_MODE_THEMES.FOCUS;
  const startLabel =
    mode === "FOCUS"
      ? "START FOCUS"
      : mode === "SHORT_BREAK"
        ? "START SHORT BREAK"
        : "START LONG BREAK";

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-1 sm:gap-3 p-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-lg shadow-slate-200/40 backdrop-blur-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={disabled}
          title="Reset session"
          className="size-11 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-transform active:scale-90"
        >
          <RotateCcw className="size-4.5" />
        </Button>

        {!isRunning ? (
          <Button
            type="button"
            onClick={status === "IDLE" ? onStart : onResume}
            disabled={disabled}
            className={cn(
              "h-13 px-3 sm:px-8 rounded-full text-xs sm:text-sm font-black tracking-wider uppercase shadow-md transition-all duration-200 active:scale-95",
              modeTheme.startButtonClass,
              isFocus && status === "IDLE" && "hover:shadow-blue-900/35",
            )}
          >
            <Play className="mr-2 size-4.5 fill-current" />
            {status === "IDLE" ? startLabel : "RESUME"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onPause}
            disabled={disabled}
            className="h-13 px-3 sm:px-8 rounded-full text-xs sm:text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-900/20 hover:brightness-110 transition-all duration-200 active:scale-95"
          >
            <Pause className="mr-2 size-4.5 fill-current" />
            PAUSE
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSkip}
          disabled={disabled}
          title="Skip session"
          className="size-11 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-transform active:scale-90"
        >
          <SkipForward className="size-4.5" />
        </Button>
      </div>
    </div>
  );
});
