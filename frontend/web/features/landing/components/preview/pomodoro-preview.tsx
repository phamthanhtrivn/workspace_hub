import {
  ChevronDown,
  Headphones,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Square,
  StickyNote,
  Target,
  Volume2,
  X,
} from "lucide-react";
import {
  POMODORO_MODES,
  POMODORO_MODE_THEMES,
} from "@/features/pomodoro/constants/pomodoro-mode-theme";
import { POMODORO_SESSION_COPY } from "@/features/pomodoro/constants/pomodoro-session";
import { PREVIEW_FOCUS_MINUTES, PREVIEW_TASK } from "../../landing-content";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewHeading, PreviewIcon } from "./preview-ui";
import {
  FocusReportPreview,
  FocusStatsPreview,
  FocusTaskPanelsPreview,
} from "./pomodoro-preview-panels";

const MODE_DURATIONS = {
  FOCUS: PREVIEW_FOCUS_MINUTES,
  SHORT_BREAK: 5,
  LONG_BREAK: 15,
} as const;

function TimerPreview() {
  const FocusIcon = POMODORO_MODE_THEMES.FOCUS.icon;

  return (
    <section
      aria-label="Sample centered Pomodoro timer"
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4"
    >
      <div className="grid w-full max-w-lg grid-cols-3 gap-1 rounded-panel bg-muted p-1">
        {POMODORO_MODES.map((mode) => {
          const theme = POMODORO_MODE_THEMES[mode];
          const Icon = theme.icon;

          return (
            <div
              key={mode}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-control border px-2 py-2 text-xs ${mode === "FOCUS" ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              <Icon
                aria-hidden="true"
                className="hidden size-4 shrink-0 @min-[480px]/preview-pomodoro:block"
              />
              <span>
                <span className="block font-semibold">{theme.name}</span>
                <span className="block font-normal opacity-75">
                  {MODE_DURATIONS[mode]} min
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative my-3 flex aspect-square w-full max-w-[320px] items-center justify-center rounded-full bg-card">
        <svg
          viewBox="0 0 360 360"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            cx="180"
            cy="180"
            r="150"
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
        </svg>
        <div className="relative flex w-full flex-col items-center px-10 text-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${POMODORO_MODE_THEMES.FOCUS.badgeClass}`}
          >
            <span className="size-1.5 rounded-full bg-muted-foreground/70" />
            <FocusIcon aria-hidden="true" className="size-3" />
            Focus
          </span>
          <p className="my-3.5 text-[3.25rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {PREVIEW_FOCUS_MINUTES}:00
          </p>
          <p className="flex max-w-full items-center gap-1.5 text-[15px] font-semibold">
            <Target
              aria-hidden="true"
              className="size-3.5 shrink-0 text-link"
            />
            <span className="truncate">{PREVIEW_TASK}</span>
            <X
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          </p>
          <p className="mt-1 flex max-w-full items-center gap-1 text-xs text-muted-foreground">
            <StickyNote aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">Build the first interaction.</span>
          </p>
        </div>
      </div>
      <div className="space-y-1 text-center text-xs text-muted-foreground">
        <p className="font-medium">Ready to start</p>
        <p>
          {POMODORO_SESSION_COPY.cycle(
            1,
            2,
            POMODORO_MODE_THEMES.SHORT_BREAK.name,
            MODE_DURATIONS.SHORT_BREAK,
          )}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
          <PreviewIcon icon={RotateCcw} label="Reset session" />
          <PreviewAction variant="default" className="h-12 px-5 text-sm">
            <Play aria-hidden="true" className="fill-current" />
            Start focus
          </PreviewAction>
          <PreviewIcon icon={SkipForward} label="Skip session" />
        </div>
        <PreviewAction className="min-h-11 opacity-50">
          <Square aria-hidden="true" />
          {POMODORO_SESSION_COPY.stop}
        </PreviewAction>
      </div>
      <div className="flex w-full max-w-lg items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <Headphones aria-hidden="true" className="size-4 text-link" />
          <span>
            <span className="block text-xs font-semibold">Focus sounds</span>
            <span className="block text-xs text-muted-foreground">
              Rain · Ambient audio
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3 text-muted-foreground">
          <Volume2 aria-hidden="true" className="size-4" />
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </span>
      </div>
    </section>
  );
}

export function PomodoroPreview() {
  return (
    <PreviewShell moduleId="pomodoro">
      <div
        role="region"
        aria-label="Sample Pomodoro full view"
        tabIndex={0}
        className="@container/preview-pomodoro min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[800px]/preview-module:p-6"
      >
        <div className="mb-6 border-b border-border pb-4">
          <PreviewHeading
            title="Pomodoro Focus"
            subtitle="A space for deep focus, a steady work rhythm and fewer distractions."
          >
            <PreviewAction className="h-10">
              <Settings aria-hidden="true" />
              {POMODORO_SESSION_COPY.settings}
            </PreviewAction>
          </PreviewHeading>
        </div>
        <div className="space-y-6">
          <TimerPreview />
          <FocusTaskPanelsPreview />
          <FocusStatsPreview />
          <FocusReportPreview />
        </div>
      </div>
    </PreviewShell>
  );
}
