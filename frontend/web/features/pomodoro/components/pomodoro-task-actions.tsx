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
            {hasSession ? "Dừng phiên & gửi duyệt" : "Gửi duyệt"}
          </Button>
        )}
        <Button type="button" size="sm" disabled={busy} onClick={() => {
          if (task.projectId) setConfirmOpen(true);
          else void submit("COMPLETE");
        }}>
          {hasSession ? "Dừng phiên & hoàn thành task" : "Hoàn thành task"}
        </Button>
      </div>
      {pending && <p role="status" className="text-xs text-slate-500">Đang lưu phiên và cập nhật task...</p>}
      {error && !confirmOpen && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!busy) setConfirmOpen(open); }}>
        <AlertDialogContent aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`}>
          <AlertDialogHeader>
            <AlertDialogTitle id={`${dialogId}-title`}>Hoàn thành task Project?</AlertDialogTitle>
            <AlertDialogDescription id={`${dialogId}-description`}>
              Task “{task.title}” sẽ chuyển sang Done và hiện chưa thể mở lại.
              {hasSession && " Phiên hiện tại sẽ dừng và lưu thời gian đã tập trung."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmOpen(false)}>Hủy</Button>
            <Button type="button" disabled={busy} onClick={() => void submit("COMPLETE")}>Xác nhận hoàn thành</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
