import { ChevronDown, EyeOff, Headphones, Play, RotateCcw, Settings, SkipForward, Square, Target, Volume2 } from "lucide-react";
import { POMODORO_MODES, POMODORO_MODE_THEMES } from "@/features/pomodoro/constants/pomodoro-mode-theme";
import { PREVIEW_FOCUS_MINUTES, PREVIEW_PROJECT, PREVIEW_TASK } from "../../landing-content";
import { PREVIEW_FOCUS_STATS } from "./preview-data";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewBadge, PreviewHeading, PreviewIcon } from "./preview-ui";

const MODE_DURATIONS = { FOCUS: PREVIEW_FOCUS_MINUTES, SHORT_BREAK: 5, LONG_BREAK: 15 } as const;

function TimerPreview() {
  return <div className="flex min-w-0 flex-col items-center gap-3">
    <div className="grid w-full grid-cols-3 gap-1 rounded-panel border border-border bg-muted p-1">{POMODORO_MODES.map(mode => {
      const theme = POMODORO_MODE_THEMES[mode];
      const Icon = theme.icon;
      return <div key={mode} className={`flex flex-col items-center gap-1 rounded-control px-1 py-2 text-center text-xs ${mode === "FOCUS" ? "bg-card font-semibold text-link" : "font-medium text-muted-foreground"}`}><Icon aria-hidden="true" className="size-3.5" /><span>{theme.name}<span className="block">{MODE_DURATIONS[mode]}m</span></span></div>;
    })}</div>
    <div className="relative my-3 flex aspect-square w-full max-w-[320px] items-center justify-center rounded-full bg-card"><svg viewBox="0 0 320 320" aria-hidden="true" className="absolute inset-0 size-full"><circle cx="160" cy="160" r="148" fill="none" stroke="var(--border)" strokeWidth="6" /><circle cx="160" cy="160" r="148" fill="none" stroke={POMODORO_MODE_THEMES.FOCUS.color} strokeWidth="6" /></svg><div className="relative flex w-full flex-col items-center px-10 text-center"><PreviewBadge tone="info" className="rounded-full border border-border px-3 py-1 uppercase tracking-[0.08em]">Focus</PreviewBadge><p className="my-3.5 text-[3.25rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">{PREVIEW_FOCUS_MINUTES}:00</p><p className="flex max-w-full items-center gap-1.5 text-[15px] font-semibold"><Target aria-hidden="true" className="size-3.5 shrink-0 text-info-content" /><span className="truncate">{PREVIEW_TASK}</span></p><p className="mt-2 text-xs text-muted-foreground">Ready to focus</p></div></div>
    <div className="flex items-center justify-center gap-3"><PreviewIcon icon={RotateCcw} label="Reset session" /><PreviewAction variant="default" className="h-13 px-8 text-sm"><Play aria-hidden="true" className="fill-current" />Start focus</PreviewAction><PreviewIcon icon={SkipForward} label="Skip session" /></div><PreviewAction className="min-h-11 opacity-50"><Square aria-hidden="true" />Stop session</PreviewAction>
  </div>;
}

export function PomodoroPreview() {
  return <PreviewShell moduleId="pomodoro">
    <div role="region" aria-label="Sample Pomodoro full view" tabIndex={0} className="@container/preview-pomodoro min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[800px]/preview-module:p-6">
      <div className="mb-6 border-b border-border pb-4"><PreviewHeading title="Pomodoro Focus" subtitle="A space for deep focus, a steady work rhythm and fewer distractions."><div className="flex gap-2"><PreviewAction><Settings aria-hidden="true" />Settings</PreviewAction><PreviewAction className="rounded-full"><EyeOff aria-hidden="true" />Deep focus</PreviewAction></div></PreviewHeading></div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-5 @min-[880px]/preview-pomodoro:grid-cols-2 @min-[880px]/preview-pomodoro:gap-x-8">
        <div className="min-w-0 space-y-5"><TimerPreview /><div className="flex items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2"><span className="flex min-w-0 items-center gap-2.5"><Headphones aria-hidden="true" className="size-4 text-info-content" /><span><span className="block text-xs font-semibold">Focus sounds</span><span className="block text-xs text-muted-foreground">Rain · Ambient audio</span></span></span><span className="flex items-center gap-3 text-muted-foreground"><Volume2 aria-hidden="true" className="size-4" /><ChevronDown aria-hidden="true" className="size-3.5" /></span></div></div>
        <div className="min-w-0 space-y-5"><div className="rounded-panel border border-border bg-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h5 className="flex items-center gap-2 text-sm font-semibold"><Target aria-hidden="true" className="size-4 text-info-content" />Current focus</h5><PreviewAction>Change focus</PreviewAction></div><p className="text-xs font-medium text-info-content">Project task · {PREVIEW_PROJECT}</p><p className="mt-3 text-lg font-semibold">{PREVIEW_TASK}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Build the first interaction and use our research findings to guide the prototype.</p><div className="mt-4 flex flex-wrap gap-3 text-xs"><span className="font-medium text-info-content">Open original task</span><span className="text-muted-foreground">In progress</span></div><div className="my-4 border-t border-border pt-4"><p className="text-xs font-semibold">Focus history</p><p className="mt-2 text-xs text-muted-foreground">2 completed sessions · 50 minutes</p></div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Session notes</p><div className="min-h-16 rounded-control border border-input px-3 py-2 text-xs text-muted-foreground">Review the research brief before the next iteration.</div></div>
          <div className="rounded-panel border border-border bg-card p-5"><h5 className="text-sm font-semibold">Today&apos;s performance</h5><dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">{PREVIEW_FOCUS_STATS.map(stat => <div key={stat.label}><dt className="text-xs text-muted-foreground">{stat.label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{stat.value}{"unit" in stat && <span className="ml-1 text-xs font-normal text-muted-foreground">{stat.unit}</span>}</dd></div>)}</dl><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/2 bg-link" /></div></div>
        </div>
      </div>
    </div>
  </PreviewShell>;
}
