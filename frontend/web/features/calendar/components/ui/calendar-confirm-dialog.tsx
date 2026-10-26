"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { AlertTriangle, HelpCircle, Info, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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

export type CalendarConfirmVariant =
  | "danger"
  | "warning"
  | "info"
  | "question";

export interface CalendarConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: CalendarConfirmVariant;
  isLoading?: boolean;
  children?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const iconByVariant = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
  question: HelpCircle,
};

const iconBgByVariant: Record<CalendarConfirmVariant, string> = {
  danger: "bg-destructive-soft text-destructive-content ring-1 ring-destructive-outline",
  warning: "bg-warning-soft text-warning-content ring-1 ring-warning-outline",
  info: "bg-info-soft text-info-content ring-1 ring-ring",
  question: "bg-info-soft text-info-content ring-1 ring-ring",
};

const confirmButtonClassByVariant: Record<CalendarConfirmVariant, string> = {
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive focus-visible:ring-ring",
  warning:
    "bg-warning text-warning-foreground hover:bg-warning focus-visible:ring-ring",
  info: "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring",
  question:
    "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring",
};

export function CalendarConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  children,
  onConfirm,
  onCancel,
}: CalendarConfirmDialogProps) {
  const IconComponent = iconByVariant[variant];

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isLoading && onCancel()}
    >
      <AlertDialogContent
        role="alertdialog"
        className={`${dialogLayout.surface} max-w-md rounded-panel border-border bg-card p-6 text-foreground sm:rounded-panel`}
        showCloseButton={false}
      >
        <AlertDialogHeader className="text-left">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-panel",
                iconBgByVariant[variant],
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base font-semibold leading-6 text-foreground">
                {title}
              </AlertDialogTitle>
              {description ? (
                <AlertDialogDescription className="mt-1.5 text-sm font-medium leading-relaxed text-muted-foreground">
                  {description}
                </AlertDialogDescription>
              ) : null}
            </div>
          </div>
        </AlertDialogHeader>

        {children ? <div className="mt-5">{children}</div> : null}

        <AlertDialogFooter className="mt-6 flex items-center justify-end gap-2 border-t-0 p-0">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
            className="h-9 cursor-pointer rounded-control border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </Button>
          <Button loading={isLoading}
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={cn(
              "h-9 cursor-pointer rounded-control px-4 text-xs font-semibold transition disabled:opacity-50",
              confirmButtonClassByVariant[variant],
            )}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

