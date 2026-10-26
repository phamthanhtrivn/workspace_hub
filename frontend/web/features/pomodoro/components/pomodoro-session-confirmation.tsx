"use client";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import type { PomodoroSessionAction } from "../types/pomodoro";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { POMODORO_MODE_THEMES } from "../constants/pomodoro-mode-theme";

export function PomodoroSessionConfirmation({ action, busy, onCancel, onConfirm }: {
  action: PomodoroSessionAction | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const message = action ? copy[action.type] : copy.reset;
  return <AlertDialog open={action !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
    <AlertDialogContent showCloseButton={false}>
      <AlertDialogHeader>
        <AlertDialogTitle>{message.title}</AlertDialogTitle>
        <AlertDialogDescription>{message.description}
          {action?.type === "mode" && <span className="mt-2 block font-medium">{POMODORO_MODE_THEMES[action.mode].name}</span>}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>{copy.keep}</Button>
        <Button loading={busy} type="button" disabled={busy} onClick={() => void onConfirm()}>{busy ? copy.savingAction : message.confirm}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
