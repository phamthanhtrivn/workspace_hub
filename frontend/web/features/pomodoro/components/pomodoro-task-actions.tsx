"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { taskActionErrorMessage } from "../hooks/use-pomodoro-task-actions";
import type { PomodoroActiveTask, PomodoroStatus, PomodoroTaskAction } from "../types/pomodoro";

interface PomodoroTaskActionsProps {
  task: PomodoroActiveTask;
  timerStatus: PomodoroStatus;
  disabled: boolean;
  onAction: (action: PomodoroTaskAction) => Promise<void>;
}

export function PomodoroTaskActions({ task, timerStatus, disabled, onAction }: PomodoroTaskActionsProps) {
  const dialogId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const hasSession = timerStatus !== "IDLE";
  const busy = disabled || pending;

  const submit = async (action: PomodoroTaskAction) => {
    if (busy) return;
    setPending(true);
    setError("");
    try {
      await onAction(action);
      setConfirmOpen(false);
    } catch (error) {
      setError(taskActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (!task.projectId && !task.calendarEventId) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap gap-2">
        {task.projectId && task.projectStatus !== "IN_REVIEW" && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submit("REVIEW")}>
            {hasSession ? "Stop session & submit for review" : "Submit for review"}
          </Button>
        )}
        <Button type="button" size="sm" disabled={busy} onClick={() => {
          if (task.projectId) setConfirmOpen(true);
          else void submit("COMPLETE");
        }}>
          {hasSession ? "Stop session & complete task" : "Complete task"}
        </Button>
      </div>
      {pending && <p role="status" className="text-xs text-slate-500">Saving the session and updating the task...</p>}
      {error && !confirmOpen && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!busy) setConfirmOpen(open); }}>
        <AlertDialogContent aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`}>
          <AlertDialogHeader>
            <AlertDialogTitle id={`${dialogId}-title`}>Complete project task?</AlertDialogTitle>
            <AlertDialogDescription id={`${dialogId}-description`}>
              Task “{task.title}” will move to Done and currently cannot be reopened.
              {hasSession && " The current session will stop and save your focus time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={() => void submit("COMPLETE")}>Confirm completion</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
