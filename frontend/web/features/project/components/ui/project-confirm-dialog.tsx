"use client";

import React from "react";
import { AlertTriangle, HelpCircle, Info, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProjectConfirmVariant = "danger" | "warning" | "info" | "question";

export interface ProjectConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ProjectConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const iconByVariant = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
  question: HelpCircle,
};

const iconBgByVariant: Record<ProjectConfirmVariant, string> = {
  danger: "bg-red-50 text-red-600 ring-1 ring-red-100",
  warning: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  info: "bg-blue-50 text-[#0052CC] ring-1 ring-blue-100",
  question: "bg-blue-50 text-[#0052CC] ring-1 ring-blue-100",
};

const confirmButtonClassByVariant: Record<ProjectConfirmVariant, string> = {
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  warning: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500",
  info: "bg-[#0052CC] text-white hover:bg-[#0747A6] focus-visible:ring-blue-500",
  question: "bg-[#0052CC] text-white hover:bg-[#0747A6] focus-visible:ring-blue-500",
};

export function ProjectConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ProjectConfirmDialogProps) {
  const IconComponent = iconByVariant[variant];

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isLoading && onCancel()}>
      <AlertDialogContent
        role="alertdialog"
        className="max-w-md rounded-2xl border-slate-100 bg-white p-6 text-slate-800 shadow-xl sm:rounded-2xl"
        showCloseButton={false}
      >
        <AlertDialogHeader className="text-left">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                iconBgByVariant[variant]
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base font-bold leading-6 text-slate-900">
                {title}
              </AlertDialogTitle>
              {description ? (
                <AlertDialogDescription className="mt-1.5 text-sm font-medium leading-relaxed text-slate-500">
                  {description}
                </AlertDialogDescription>
              ) : null}
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6 flex items-center justify-end gap-2 border-t-0 p-0">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-lg border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={cn(
              "h-9 cursor-pointer rounded-lg px-4 text-xs font-bold shadow-sm transition disabled:opacity-50",
              confirmButtonClassByVariant[variant]
            )}
          >
            {isLoading ? "..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ProjectConfirmDialog;
