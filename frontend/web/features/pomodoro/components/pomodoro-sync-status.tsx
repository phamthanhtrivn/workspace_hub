"use client";

import { CloudCheck, CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { POMODORO_SYNC_COPY } from "../constants/pomodoro-sync";
import type { PomodoroTimerSyncStatus } from "../utils/pomodoro-timer-sync";

interface PomodoroSyncStatusProps {
  status: PomodoroTimerSyncStatus;
  settingsPending?: boolean;
  onRetry: () => void;
  compact?: boolean;
}

export function PomodoroSyncStatus({ status, settingsPending = false, onRetry, compact = false }: PomodoroSyncStatusProps) {
  const waiting = status === "pending" || status === "error" || settingsPending;
  if (compact && status === "synced" && !settingsPending) return null;
  const label = status === "synced" && settingsPending ? POMODORO_SYNC_COPY.settings : POMODORO_SYNC_COPY[status];
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 text-xs", compact ? "mt-1" : "justify-center", waiting ? "text-warning-content" : "text-muted-foreground")}>
      <span role="status" className="inline-flex min-w-0 items-center gap-1.5">
        {status === "saving" ? <Spinner className="size-3.5 shrink-0" /> : waiting ? <CloudOff aria-hidden="true" className="size-3.5 shrink-0" /> : <CloudCheck aria-hidden="true" className="size-3.5 shrink-0" />}
        {label}
      </span>
      {waiting && <Button type="button" variant="link" size="sm" className="h-auto px-1 py-1 text-xs text-warning-content" disabled={status === "saving"} onClick={onRetry}>
        <RefreshCw aria-hidden="true" className="size-3" />{POMODORO_SYNC_COPY.retry}
      </Button>}
    </div>
  );
}
