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
  const modeTheme = POMODORO_MODE_THEMES[mode] ?? POMODORO_MODE_THEMES.FOCUS;
  const startLabel =
    mode === "FOCUS"
      ? "Start focus"
      : mode === "SHORT_BREAK"
        ? "Start short break"
        : "Start long break";

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={disabled}
          title="Reset session" aria-label="Reset session"
          className="size-11 rounded-control text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
        >
          <RotateCcw className="size-4.5" />
        </Button>

        {!isRunning ? (
          <Button
            type="button"
            onClick={status === "IDLE" ? onStart : onResume}
            disabled={disabled}
            className={cn(
              "h-13 px-3 sm:px-8 rounded-control text-xs sm:text-sm font-semibold  transition-colors duration-200",
              modeTheme.startButtonClass,
            )}
          >
            <Play className="mr-2 size-4.5 fill-current" />
            {status === "IDLE" ? startLabel : "Resume"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onPause}
            disabled={disabled}
            className="h-13 px-3 sm:px-8 rounded-control text-xs sm:text-sm font-semibold  bg-warning text-warning-foreground transition-colors duration-200"
          >
            <Pause className="mr-2 size-4.5 fill-current" />
            Pause
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSkip}
          disabled={disabled}
          title="Skip session" aria-label="Skip session"
          className="size-11 rounded-control text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
        >
          <SkipForward className="size-4.5" />
        </Button>
      </div>
    </div>
  );
});
