"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { PomodoroTaskPicker } from "./pomodoro-task-picker";
import { PomodoroCalendarTaskForm } from "./pomodoro-calendar-task-form";
import { PomodoroFocusSwitchConfirmation } from "./pomodoro-focus-switch-confirmation";

export type PomodoroFocusDialogView = "choose" | "create";

export function PomodoroFocusDialog({ initialView, focusDurationMinutes, onClose }: {
  initialView: PomodoroFocusDialogView;
  focusDurationMinutes: number;
  onClose: () => void;
}) {
  const { busy, pendingFocusTarget, cancelFocusSwitch, setFocusDialogOpen } = usePomodoroSessionActions();
  const [savingTask, setSavingTask] = useState(false);
  const locked = busy || savingTask;
  const dialogId = useId();
  const close = useCallback(() => {
    if (locked) return;
    cancelFocusSwitch();
    onClose();
  }, [locked, cancelFocusSwitch, onClose]);
  useEffect(() => {
    setFocusDialogOpen(true);
    return () => setFocusDialogOpen(false);
  }, [setFocusDialogOpen]);

  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`} showCloseButton={false} className="flex max-w-[40rem] flex-col rounded-dialog border-border bg-card">
      <FocusDialogContent dialogId={dialogId} initialView={initialView} focusDurationMinutes={focusDurationMinutes} onClose={close}
        onCreated={onClose} onSavingChange={setSavingTask} locked={locked} confirming={Boolean(pendingFocusTarget)} />
    </DialogContent>
  </Dialog>;
}

function FocusDialogContent({ dialogId, initialView, focusDurationMinutes, onClose, onCreated, onSavingChange, locked, confirming }: {
  dialogId: string;
  initialView: PomodoroFocusDialogView;
  focusDurationMinutes: number;
  onClose: () => void;
  onCreated: () => void;
  onSavingChange: (saving: boolean) => void;
  locked: boolean;
  confirming: boolean;
}) {
  const [view, setView] = useState(initialView);
  const [formOpened, setFormOpened] = useState(initialView === "create");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = dialogId;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [view, confirming]);
  const openCreate = () => { setFormOpened(true); setView("create"); };

  return <div className="flex min-h-0 flex-col">
    <DialogHeader className="shrink-0 border-b border-border pr-16">
      <DialogTitle id={`${id}-title`} ref={headingRef} tabIndex={-1} className="outline-none">
        {confirming ? "Confirm focus switch" : view === "create" ? "New task" : "Change focus"}
      </DialogTitle>
      <DialogDescription id={`${id}-description`} className="text-xs">
        {confirming ? "Save your current session before starting another focus." : view === "create"
          ? "Create a personal task in My tasks and start focusing." : "Choose a task or start free focus."}
      </DialogDescription>
    </DialogHeader>
    <Button type="button" size="icon-sm" variant="ghost" disabled={locked} aria-label="Close focus picker"
      onClick={onClose} className="absolute right-4 top-4"><X className="size-4" /></Button>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div hidden={confirming || view !== "choose"} className="p-5">
        <PomodoroTaskPicker open={!confirming && view === "choose"} onCreateCalendarTask={openCreate}
          initialSource={initialView === "create" ? "calendar" : undefined} />
      </div>
      {formOpened && <div hidden={confirming || view !== "create"} className="space-y-4 p-5">
        <Button type="button" size="sm" variant="ghost" disabled={locked} onClick={() => setView("choose")}>
          <ArrowLeft className="size-4" />Back to tasks
        </Button>
        <PomodoroCalendarTaskForm focusDurationMinutes={focusDurationMinutes} onCreated={onCreated} onSavingChange={onSavingChange} />
      </div>}
      {confirming && <PomodoroFocusSwitchConfirmation />}
    </div>
  </div>;
}
