"use client";

import Link from "next/link";
import { ArrowUpRight, Pause, Play, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITY_LABELS, TASK_STATUS_OPTIONS } from "@/features/project/constants/task.constants";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTaskSourceBadge } from "./pomodoro-task-source-badge";
import { PomodoroSyncStatus } from "./pomodoro-sync-status";
import { POMODORO_MODE_THEMES } from "../constants/pomodoro-mode-theme";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { getPomodoroCycleContext } from "../utils/pomodoro-cycle";
import { focusTaskLink } from "../utils/focus-task";
import { formatTimerClock, timerProgress, timerStatusLabel } from "../utils/pomodoro-timer-presentation";

const secondaryButton = "border-(--mini-timer-foreground)/25 bg-transparent text-(--mini-timer-foreground) hover:bg-(--mini-timer-foreground)/10 hover:text-(--mini-timer-foreground) focus-visible:ring-(--mini-timer-foreground)";

export function PomodoroIslandDetails() {
  const { status, mode, activeTask, timeLeft, totalDuration, cycleCount, config, pause, resume, start,
    stopSession, busy, isReady, completionStatus, retryCompletion, syncStatus, retrySync, configLoadError } = usePomodoroSession();
  const finished = status === "RUNNING" && timeLeft === 0;
  const theme = POMODORO_MODE_THEMES[mode];
  const cycle = getPomodoroCycleContext(mode, cycleCount, config.longBreakInterval);
  const taskLink = activeTask ? focusTaskLink(activeTask) : null;
  const taskStatus = TASK_STATUS_OPTIONS.find(option => option.value === activeTask?.projectStatus)?.label;
  const elapsed = Math.max(0, totalDuration - timeLeft);
  const toggleTimer = status === "RUNNING" ? pause : status === "PAUSED" ? resume : start;

  return <div className="space-y-4 px-5 pb-5 pt-1">
    {activeTask && <div className="space-y-2">
      <PomodoroTaskSourceBadge task={activeTask} inverse />
      <h3 className="break-words text-base font-semibold leading-snug">{activeTask.title}</h3>
      {(taskStatus || activeTask.priority) && <div className="flex flex-wrap gap-2 text-xs text-(--mini-timer-foreground)/80">
        {taskStatus && <span>{taskStatus}</span>}
        {activeTask.priority && <span className="rounded bg-(--mini-timer-foreground)/10 px-1.5 py-0.5">{TASK_PRIORITY_LABELS[activeTask.priority]} priority</span>}
      </div>}
    </div>}
    {!activeTask && <h3 className="text-base font-semibold">Free focus</h3>}

    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span aria-label={`${theme.name}: ${formatTimerClock(timeLeft)} remaining`} className="text-5xl font-semibold leading-none tracking-tight tabular-nums">{formatTimerClock(timeLeft)}</span>
        <p role="status" className="max-w-48 text-right text-xs text-(--mini-timer-foreground)/80">{timerStatusLabel(status, finished, completionStatus)}</p>
      </div>
      <div role="progressbar" aria-label={`${theme.name} session progress`} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(timerProgress(timeLeft, totalDuration))} className="mt-4 h-1 overflow-hidden rounded-full bg-(--mini-timer-foreground)/20">
        <div className="h-full rounded-full bg-(--mini-timer-foreground) transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${timerProgress(timeLeft, totalDuration)}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-(--mini-timer-foreground)/75 tabular-nums">
        <span>{formatTimerClock(elapsed)} elapsed / {formatTimerClock(totalDuration)}</span>
        <span>Focus {cycle.focusNumber}/{cycle.interval}</span>
      </div>
    </div>

    <PomodoroSyncStatus status={syncStatus} settingsPending={configLoadError} onRetry={retrySync} compact inverse />
    {finished && <p className="text-xs leading-relaxed text-(--mini-timer-foreground)/80">{copy.pendingHelp}</p>}
    <div className="flex flex-wrap gap-2">
      {finished && completionStatus === "error" ? <Button type="button" size="sm" variant="outline" className={secondaryButton}
        disabled={busy} onClick={() => void retryCompletion()}><RefreshCw aria-hidden="true" className="size-4" />{copy.retry}</Button>
        : <Button type="button" size="sm" variant="unstyled" disabled={!isReady || busy || finished}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-control bg-(--mini-timer-foreground) px-3 py-2 text-sm font-semibold text-(--mini-timer-surface) hover:bg-(--mini-timer-foreground)/90 focus-visible:ring-(--mini-timer-foreground)"
          onClick={toggleTimer}>{status === "RUNNING" ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
          {status === "RUNNING" ? "Pause" : status === "PAUSED" ? "Resume" : `Start ${theme.name.toLowerCase()}`}</Button>}
      {status !== "IDLE" && <Button type="button" size="sm" variant="outline" disabled={busy || finished} className={`${secondaryButton} min-h-10`}
        onClick={() => void stopSession().catch(error => toast.error(error instanceof Error ? error.message : copy.stopFailed))}>
        <Square aria-hidden="true" className="size-3.5" />{copy.stop}
      </Button>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--mini-timer-foreground)/15 pt-3 text-xs">
      {taskLink && <Link href={taskLink} className="touch-target inline-flex items-center rounded px-1 py-1 text-(--mini-timer-foreground)/85 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mini-timer-foreground)">Open original task</Link>}
      <Link href="/pomodoro" className="touch-target ml-auto inline-flex items-center gap-1 rounded px-1 py-1 font-medium text-(--mini-timer-foreground) underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mini-timer-foreground)">Open Pomodoro<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>
    </div>
  </div>;
}
