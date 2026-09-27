"use client";

import { useCallback, useState } from "react";
import type {
  CalendarConfirmDialogProps,
  CalendarConfirmVariant,
} from "../components/ui/calendar-confirm-dialog";

interface CalendarConfirmDialogState {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: CalendarConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function useCalendarConfirmDialog() {
  const [dialogState, setDialogState] = useState<CalendarConfirmDialogState>({
    isOpen: false,
    title: "",
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (options: {
      title: string;
      description?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: CalendarConfirmVariant;
      onConfirm: () => void | Promise<void>;
    }) => {
      setDialogState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        variant: options.variant ?? "danger",
        isLoading: false,
        onConfirm: async () => {
          try {
            setDialogState((prev) => ({ ...prev, isLoading: true }));
            await options.onConfirm();
            setDialogState((prev) => ({
              ...prev,
              isOpen: false,
              isLoading: false,
            }));
          } catch (error) {
            setDialogState((prev) => ({ ...prev, isLoading: false }));
            throw error;
          }
        },
      });
    },
    [],
  );

  const close = useCallback(() => {
    setDialogState((prev) => ({
      ...prev,
      isOpen: false,
      isLoading: false,
    }));
  }, []);

  const dialogProps: CalendarConfirmDialogProps = {
    open: dialogState.isOpen,
    title: dialogState.title,
    description: dialogState.description,
    confirmLabel: dialogState.confirmLabel,
    cancelLabel: dialogState.cancelLabel,
    variant: dialogState.variant,
    isLoading: dialogState.isLoading,
    onConfirm: dialogState.onConfirm,
    onCancel: close,
  };

  return {
    dialogProps,
    confirm,
    close,
  };
}

