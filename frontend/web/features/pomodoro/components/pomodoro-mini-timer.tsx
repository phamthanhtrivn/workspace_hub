"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pause, Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { usePomodoroSession } from "./pomodoro-session-provider";

function ActiveMiniTimer() {
  const pathname = usePathname();
  const { status, mode, activeTask, timeLeft, pause, resume, stopSession, busy } = usePomodoroSession();
  if (status === "IDLE" || pathname === "/pomodoro") return null;
  return (
    <aside aria-label="Active focus session" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs sm:px-6">
      <Timer className="size-4 shrink-0 text-blue-700" />
      <Link href="/pomodoro" className="min-w-0 flex-1 truncate font-semibold text-slate-700 hover:underline">{activeTask?.title || "Free focus"}</Link>
      <span className="text-slate-500">{mode === "FOCUS" ? "Focus" : "Break"}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-blue-900">{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</span>
      <Button size="sm" variant="ghost" disabled={busy} aria-label={status === "RUNNING" ? "Pause focus" : "Resume focus"} onClick={status === "RUNNING" ? pause : resume}>
        {status === "RUNNING" ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} aria-label="Stop and save focus session" onClick={() => void stopSession().catch((error) => toast.error(error instanceof Error ? error.message : "Unable to save the session."))}><Square className="size-3.5" /></Button>
      <Link href="/pomodoro" className="font-semibold text-blue-700 hover:underline">Open Pomodoro</Link>
    </aside>
  );
}

export function PomodoroMiniTimer() {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <ActiveMiniTimer /> : null;
}
