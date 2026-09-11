"use client";

import { AlertTriangle } from "lucide-react";

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
  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="meeting-alert-dialog-title"
      aria-describedby={
        description ? "meeting-alert-dialog-description" : undefined
      }
      className="fixed inset-0 z-[140] grid place-items-center bg-black/65 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0d1420] p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/12 text-red-200 ring-1 ring-red-300/15">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="meeting-alert-dialog-title"
              className="text-sm font-black leading-6 text-slate-50"
            >
              {title}
            </h2>
            {description ? (
              <p
                id="meeting-alert-dialog-description"
                className="mt-1 text-sm font-semibold leading-6 text-slate-400"
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
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
        </div>
      </div>
    </div>
  );
}
