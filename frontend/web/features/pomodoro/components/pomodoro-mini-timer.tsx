"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Pause, Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAppSelector } from "@/store/store";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";

function ActiveMiniTimer() {
  const pathname = usePathname();
  const { status, mode, activeTask, timeLeft, pause, resume, stopSession, busy, completionStatus, retryCompletion } = usePomodoroSession();
  const finished = status === "RUNNING" && timeLeft === 0;
  if (status === "IDLE" || pathname === "/pomodoro") return null;
  return (
    <aside aria-label="Active focus session" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-info-soft/60 px-4 py-3 text-xs sm:px-6">
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-panel bg-info-soft/80 text-info-content"><Timer className="size-4" /></span>
        <div className="min-w-0">
          <p role="status" className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {busy ? <Spinner size={14} /> : <span aria-hidden="true" className={`size-1.5 rounded-full ${status === "RUNNING" ? "bg-link" : "bg-warning-content"}`} />}
            {finished ? (completionStatus === "error" ? copy.waiting : copy.saving) : status === "PAUSED" ? "Paused" : mode === "FOCUS" ? "Focus in progress" : "Break in progress"}
          </p>
          <Link href="/pomodoro" className="block truncate text-sm font-semibold text-foreground outline-none hover:text-info-content focus-visible:ring-2 focus-visible:ring-ring" title={activeTask?.title || "Free focus"}>{activeTask?.title || "Free focus"}</Link>
        </div>
      </div>
      <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-3">
        {finished && completionStatus === "error" && <Button type="button" variant="outline" size="sm" onClick={() => void retryCompletion()}>{copy.retry}</Button>}
        <div className="flex items-center gap-3 rounded-panel border border-border bg-card px-3 py-1.5">
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">{mode === "FOCUS" ? "Focus" : "Break"}</p>
            <span className="font-mono text-lg font-semibold leading-6 tracking-tight tabular-nums text-info-content">{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</span>
          </div>
          <div className="flex items-center gap-1 border-l border-border pl-3">
            <Button size="icon-sm" variant="ghost" className="rounded-control text-info-content hover:bg-info-soft hover:text-info-content" disabled={busy} title={status === "RUNNING" ? "Pause focus" : "Resume focus"} aria-label={status === "RUNNING" ? "Pause focus" : "Resume focus"} onClick={status === "RUNNING" ? pause : resume}>
              {status === "RUNNING" ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button size="icon-sm" variant="ghost" className="rounded-control text-muted-foreground hover:bg-muted hover:text-foreground" disabled={busy} title="Stop and save focus session" aria-label="Stop and save focus session" onClick={() => void stopSession().catch((error) => toast.error(error instanceof Error ? error.message : "Unable to save the session."))}><Square className="size-3.5" /></Button>
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="gap-1.5 rounded-control text-info-content hover:bg-info-soft/70 hover:text-info-content">
          <Link href="/pomodoro">Open Pomodoro<ArrowUpRight className="size-3.5" /></Link>
        </Button>
      </div>
    </aside>
  );
}

export function PomodoroMiniTimer() {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <ActiveMiniTimer /> : null;
}
