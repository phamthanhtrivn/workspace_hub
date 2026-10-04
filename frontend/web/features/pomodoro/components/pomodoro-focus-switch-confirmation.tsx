"use client";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";

export function PomodoroFocusSwitchConfirmation() {
  const { activeTask, pendingFocusTarget, busy, confirmFocusSwitch, cancelFocusSwitch } = usePomodoroSessionActions();
  return <div>
    <DialogHeader>
      <DialogTitle>Switch focus task?</DialogTitle>
      <DialogDescription>
        Save the time spent on {activeTask?.title || "your current session"} and start {pendingFocusTarget?.task
          ? `focusing on ${pendingFocusTarget.task.title}` : "free focus without a task"}?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button type="button" variant="outline" disabled={busy} onClick={cancelFocusSwitch}>Keep current session</Button>
      <Button type="button" disabled={busy} onClick={() => void confirmFocusSwitch()}>{busy ? "Saving…" : "Save & switch task"}</Button>
    </DialogFooter>
  </div>;
}
