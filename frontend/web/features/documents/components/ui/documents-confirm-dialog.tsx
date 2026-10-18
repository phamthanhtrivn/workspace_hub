"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

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
  danger: "bg-destructive-soft text-destructive-content ring-1 ring-destructive-outline",
  warning: "bg-warning-soft text-warning-content ring-1 ring-warning-outline",
  info: "bg-info-soft text-info-content ring-1 ring-ring",
};

const confirmButtonClassByVariant = {
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive focus-visible:ring-ring",
  warning: "bg-warning text-warning-foreground hover:bg-warning focus-visible:ring-ring",
  info: "bg-primary text-primary-foreground hover:bg-primary focus-visible:ring-ring",
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
        className={`${dialogLayout.surface} max-w-md border-border bg-card p-6 text-foreground rounded-dialog`}
        showCloseButton={false}
      >
        <div className="flex items-start gap-4">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-panel", iconBgByVariant[variant])}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="text-base font-semibold leading-6 text-foreground">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="mt-1.5 text-sm font-semibold leading-relaxed text-muted-foreground">
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
            className="h-10 cursor-pointer rounded-control border border-border bg-card px-5 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "h-10 cursor-pointer rounded-control px-5 text-xs font-semibold transition disabled:opacity-50",
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
