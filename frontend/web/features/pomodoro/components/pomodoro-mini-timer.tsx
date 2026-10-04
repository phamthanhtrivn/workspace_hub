"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Pause, Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { usePomodoroSession } from "./pomodoro-session-provider";

function ActiveMiniTimer() {
  const pathname = usePathname();
  const { status, mode, activeTask, timeLeft, pause, resume, stopSession, busy } = usePomodoroSession();
  if (status === "IDLE" || pathname === "/pomodoro") return null;
  return (
    <aside aria-label="Active focus session" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3 text-xs sm:px-6">
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100/80 text-blue-700"><Timer className="size-4" /></span>
        <div className="min-w-0">
          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${status === "RUNNING" ? "bg-blue-600" : "bg-amber-500"}`} />
            {status === "PAUSED" ? "Paused" : mode === "FOCUS" ? "Focus in progress" : "Break in progress"}
          </p>
          <Link href="/pomodoro" className="block truncate text-sm font-semibold text-slate-800 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/40" title={activeTask?.title || "Free focus"}>{activeTask?.title || "Free focus"}</Link>
        </div>
      </div>
      <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-3 py-1.5">
          <div className="text-right">
            <p className="text-[10px] font-medium text-slate-500">{mode === "FOCUS" ? "Focus" : "Break"}</p>
            <span className="font-mono text-lg font-semibold leading-6 tracking-tight tabular-nums text-blue-900">{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</span>
          </div>
          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <Button size="icon-sm" variant="ghost" className="rounded-lg text-blue-700 hover:bg-blue-50 hover:text-blue-800" disabled={busy} title={status === "RUNNING" ? "Pause focus" : "Resume focus"} aria-label={status === "RUNNING" ? "Pause focus" : "Resume focus"} onClick={status === "RUNNING" ? pause : resume}>
              {status === "RUNNING" ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button size="icon-sm" variant="ghost" className="rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800" disabled={busy} title="Stop and save focus session" aria-label="Stop and save focus session" onClick={() => void stopSession().catch((error) => toast.error(error instanceof Error ? error.message : "Unable to save the session."))}><Square className="size-3.5" /></Button>
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="gap-1.5 rounded-lg text-blue-700 hover:bg-blue-100/70 hover:text-blue-800">
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
