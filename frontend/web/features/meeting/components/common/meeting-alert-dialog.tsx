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
  danger: "bg-red-600 text-white hover:bg-red-500",
  warning: "bg-amber-500 text-white hover:bg-amber-400",
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
        className="max-w-sm border-white/10 bg-[#0d1420] p-4 text-white"
        showCloseButton={false}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/12 text-red-200 ring-1 ring-red-300/15">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="text-sm font-black leading-6 text-slate-50">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="mt-1 text-sm font-semibold leading-6 text-slate-400">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter className="mt-5 grid grid-cols-2 gap-2 border-t-0 p-0">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 cursor-pointer rounded-lg bg-white/8 px-3 text-sm font-black text-slate-200 transition hover:bg-white/12 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 cursor-pointer rounded-lg px-3 text-sm font-black transition ${confirmButtonClassByVariant[variant]}`}
          >
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
