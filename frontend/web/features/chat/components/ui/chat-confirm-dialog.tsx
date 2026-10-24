"use client";
import { useId as useInputFieldId } from "react";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React from "react";
import { AlertTriangle, Trash2, Info, HelpCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


export type ChatConfirmVariant = "danger" | "warning" | "info" | "question";

export interface ChatConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
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
  className?: string;
  overlayClassName?: string;
}

const iconByVariant = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
  question: HelpCircle,
};

const iconBgByVariant: Record<ChatConfirmVariant, string> = {
  danger: "bg-destructive-soft text-destructive-content ring-1 ring-destructive-outline",
  warning: "bg-warning-soft text-warning-content ring-1 ring-warning-outline",
  info: "bg-info-soft text-info-content ring-1 ring-ring",
  question: "bg-info-soft text-info-content ring-1 ring-ring",
};

const confirmButtonClassByVariant: Record<ChatConfirmVariant, string> = {
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive focus-visible:ring-ring",
  warning: "bg-warning text-warning-foreground hover:bg-warning focus-visible:ring-ring",
  info: "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring",
  question: "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring",
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
  className,
  overlayClassName,
}: ChatConfirmDialogProps) {
  const inputFieldId = useInputFieldId();
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
        className={cn(`${dialogLayout.surface} max-w-md border-border bg-card p-6 text-foreground rounded-dialog`, className)}
        overlayClassName={overlayClassName}
        showCloseButton={false}
      >
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
              <AlertDialogDescription className="mt-1.5 text-sm font-semibold leading-relaxed text-muted-foreground">
                {description}
              </AlertDialogDescription>
            ) : null}
            {confirmationText !== undefined ? (
              <div className="mt-4 space-y-2">
                <label htmlFor={`${inputFieldId}-field-112`} className="text-xs font-semibold uppercase text-muted-foreground">
                  {confirmationLabel ?? `Type "${confirmationText}" to confirm`}
                </label>
                <Input id={`${inputFieldId}-field-112`} unstyled
                  type="text"
                  value={confirmationValue}
                  disabled={isLoading}
                  onChange={(event) =>
                    onConfirmationValueChange?.(event.target.value)
                  }
                  placeholder={confirmationPlaceholder ?? confirmationText}
                  className="h-10 w-full rounded-control border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-info-outline focus:ring-4 focus:ring-ring disabled:opacity-50"
                />
              </div>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter className="mt-6 flex items-center justify-end gap-3 border-t-0 p-0">
          <Button variant="unstyled"
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="h-10 cursor-pointer rounded-control border border-border bg-card px-5 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </Button>
          <Button loading={isLoading} variant="unstyled"
            type="button"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
            className={cn(
              "h-10 cursor-pointer rounded-control px-5 text-xs font-semibold transition disabled:opacity-50",
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

export default ChatConfirmDialog;
