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
    "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20 active:scale-[0.98]",
  warning:
    "bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-600/20 active:scale-[0.98]",
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
        className="max-w-sm rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-2xl ring-1 ring-slate-900/5 transition-all duration-200"
        showCloseButton={false}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
              variant === "danger"
                ? "border-red-100 bg-red-50 text-red-600"
                : "border-amber-100 bg-amber-50 text-amber-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="text-base font-bold leading-snug text-slate-900">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter className="mt-6 flex items-center justify-end gap-2 border-t-0 p-0 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]"
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
