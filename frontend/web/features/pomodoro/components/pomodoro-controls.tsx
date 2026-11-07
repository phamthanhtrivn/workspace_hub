"use client";

import React from "react";
import { Play, Pause, RotateCcw, SkipForward, Square } from "lucide-react";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
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
  onStop: () => void;
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
  onStop,
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
    <div className="flex w-full min-w-0 max-w-sm flex-col items-center justify-center gap-3">
      <div className="grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={disabled}
          title={copy.resetHint} aria-label="Reset session"
          className="size-11 rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>

        {!isRunning ? (
          <Button
            type="button"
            onClick={status === "IDLE" ? onStart : onResume}
            disabled={disabled}
            className={cn(
              "h-12 min-w-0 gap-2 whitespace-normal rounded-control px-3 text-sm font-semibold leading-snug transition-colors duration-150 motion-reduce:transition-none sm:px-5",
              modeTheme.startButtonClass,
            )}
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            {status === "IDLE" ? startLabel : "Resume"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onPause}
            disabled={disabled}
            className="h-12 min-w-0 gap-2 whitespace-normal rounded-control bg-primary px-3 text-sm font-semibold leading-snug text-primary-foreground transition-colors duration-150 hover:bg-primary-hover motion-reduce:transition-none sm:px-5"
          >
            <Pause aria-hidden="true" className="size-4 fill-current" />
            Pause
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSkip}
          disabled={disabled}
          title={copy.skipHint} aria-label="Skip session"
          className="size-11 rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          <SkipForward aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Button type="button" variant="outline" disabled={disabled || status === "IDLE"} onClick={onStop} className="h-10 gap-2 text-xs text-muted-foreground hover:text-foreground">
        <Square aria-hidden="true" className="size-3.5" />{copy.stop}
      </Button>
    </div>
  );
});
