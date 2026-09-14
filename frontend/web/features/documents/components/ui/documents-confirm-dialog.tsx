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

export type DocumentsConfirmVariant = "danger" | "warning" | "info";

export interface DocumentsConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: DocumentsConfirmVariant;
  isLoading?: boolean;
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
  info: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
};

export function DocumentsConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: DocumentsConfirmDialogProps) {
  const IconComponent = iconByVariant[variant];

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isLoading && onCancel()}>
      <AlertDialogContent
        role="alertdialog"
        className="max-w-md border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-3xl"
        showCloseButton={false}
      >
        <div className="flex items-start gap-4">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", iconBgByVariant[variant])}>
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
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "h-10 cursor-pointer rounded-2xl px-5 text-xs font-bold transition shadow-md disabled:opacity-50",
              confirmButtonClassByVariant[variant]
            )}
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
