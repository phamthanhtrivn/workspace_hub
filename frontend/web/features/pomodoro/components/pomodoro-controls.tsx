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
      <div className="flex w-full min-w-0 items-center justify-center gap-3.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onReset}
          disabled={disabled}
          title={copy.resetHint}
          aria-label="Reset session"
          className="size-12 shrink-0 rounded-control border-border bg-card text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          <RotateCcw aria-hidden="true" className="size-5" />
        </Button>

        {!isRunning ? (
          <Button
            type="button"
            onClick={status === "IDLE" ? onStart : onResume}
            disabled={disabled}
            className={cn(
              "h-12 min-w-0 flex-1 gap-2.5 whitespace-normal rounded-control px-6 text-sm font-semibold leading-snug transition-all duration-150 active:scale-[0.99] motion-reduce:transition-none",
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
            className={cn(
              "h-12 min-w-0 flex-1 gap-2.5 whitespace-normal rounded-control px-6 text-sm font-semibold leading-snug transition-all duration-150 active:scale-[0.99] motion-reduce:transition-none",
              modeTheme.startButtonClass,
            )}
          >
            <Pause aria-hidden="true" className="size-4 fill-current" />
            Pause
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onSkip}
          disabled={disabled}
          title={copy.skipHint}
          aria-label="Skip session"
          className="size-12 shrink-0 rounded-control border-border bg-card text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          <SkipForward aria-hidden="true" className="size-5" />
        </Button>
      </div>
      {status !== "IDLE" && (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onStop}
          className="h-9 gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
        >
          <Square aria-hidden="true" className="size-3.5" />
          {copy.stop}
        </Button>
      )}
    </div>
  );
});
