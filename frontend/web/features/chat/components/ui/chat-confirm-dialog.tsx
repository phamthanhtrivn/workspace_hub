"use client";

import React from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ChatConfirmVariant = "danger" | "warning" | "info";

export interface ChatConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ChatConfirmVariant;
  isLoading?: boolean;
  confirmationText?: string;
  confirmationValue?: string;
  confirmationPlaceholder?: string;
  confirmationLabel?: string;
  onConfirmationValueChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const iconByVariant = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
};

const iconBgByVariant = {
  danger: "bg-red-50 text-red-600 ring-1 ring-red-100",
  warning: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  info: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
};

const confirmButtonClassByVariant = {
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  warning: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500",
  info: "bg-[#0052CC] text-white hover:bg-[#0043A8] focus-visible:ring-blue-500",
};

export function ChatConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  confirmationText,
  confirmationValue = "",
  confirmationPlaceholder,
  confirmationLabel,
  onConfirmationValueChange,
  onConfirm,
  onCancel,
}: ChatConfirmDialogProps) {
  const IconComponent = iconByVariant[variant];
  const isConfirmDisabled =
    isLoading ||
    (confirmationText !== undefined && confirmationValue !== confirmationText);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isLoading && onCancel()}
    >
      <AlertDialogContent
        role="alertdialog"
        className="max-w-md border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-3xl"
        showCloseButton={false}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
              iconBgByVariant[variant],
            )}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="text-base font-black leading-6 text-slate-800">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">
                {description}
              </AlertDialogDescription>
            ) : null}
            {confirmationText !== undefined ? (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-black uppercase text-slate-500">
                  {confirmationLabel ?? `Type "${confirmationText}" to confirm`}
                </label>
                <input
                  type="text"
                  value={confirmationValue}
                  disabled={isLoading}
                  onChange={(event) =>
                    onConfirmationValueChange?.(event.target.value)
                  }
                  placeholder={confirmationPlaceholder ?? confirmationText}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                />
              </div>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter className="mt-6 flex items-center justify-end gap-3 border-t-0 p-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="h-10 cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
            className={cn(
              "h-10 cursor-pointer rounded-2xl px-5 text-xs font-bold transition shadow-md disabled:opacity-50",
              confirmButtonClassByVariant[variant],
            )}
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ChatConfirmDialog;
