"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type MeetingAlertDialogVariant = "danger" | "warning";

export interface MeetingAlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: MeetingAlertDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const confirmButtonClassByVariant: Record<MeetingAlertDialogVariant, string> = {
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive",
  warning:
    "bg-warning text-warning-foreground hover:bg-warning",
};

export function MeetingAlertDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  onConfirm,
  onCancel,
}: MeetingAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogContent
        role="alertdialog"
        className="max-w-sm rounded-dialog border border-border bg-card p-5 ring-1 ring-ring/5 transition-all duration-200"
        showCloseButton={false}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-panel border ${
              variant === "danger"
                ? "border-border bg-destructive-soft text-destructive"
                : "border-border bg-warning-soft text-warning"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="text-base font-semibold leading-snug text-foreground">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter className="mt-6 flex items-center justify-end gap-2 border-t-0 p-0 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-full border border-input bg-card px-4 text-xs font-semibold text-foreground transition hover:bg-muted hover:text-foreground"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 cursor-pointer rounded-full px-4 text-xs font-semibold transition ${confirmButtonClassByVariant[variant]}`}
          >
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
