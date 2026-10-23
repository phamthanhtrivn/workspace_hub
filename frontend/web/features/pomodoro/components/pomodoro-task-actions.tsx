"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { taskActionErrorMessage } from "../hooks/use-pomodoro-task-actions";
import type { PomodoroActiveTask, PomodoroStatus, PomodoroTaskAction } from "../types/pomodoro";
import { LoadingState } from "@/components/ui/loading-state";

interface PomodoroTaskActionsProps {
  task: PomodoroActiveTask;
  timerStatus: PomodoroStatus;
  disabled: boolean;
  onAction: (action: PomodoroTaskAction) => Promise<void>;
}

export function PomodoroTaskActions({ task, timerStatus, disabled, onAction }: PomodoroTaskActionsProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const hasSession = timerStatus !== "IDLE";
  const busy = disabled || pending;

  const submitForReview = async () => {
    if (busy) return;
    setPending(true);
    setError("");
    try {
      await onAction("REVIEW");
    } catch (error) {
      setError(taskActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (!task.projectId || task.projectStatus === "IN_REVIEW") return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        <Button loading={pending} type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submitForReview()}>
          {hasSession ? "Stop session & submit for review" : "Submit for review"}
        </Button>
      </div>
      {pending && <LoadingState label="Saving the session and updating the task..." className="text-xs text-muted-foreground" />}
      {error && <p role="alert" className="text-xs text-destructive-content">{error}</p>}
    </div>
  );
}
