"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ChatConfirmDialogProps,
  ChatConfirmVariant,
} from "@/features/chat/components/ui/chat-confirm-dialog";

export interface ChatConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ChatConfirmVariant;
  confirmationText?: string;
  confirmationPlaceholder?: string;
  confirmationLabel?: string;
}

export function useChatConfirmDialog() {
  const [options, setOptions] = useState<ChatConfirmOptions | null>(null);
  const [confirmationValue, setConfirmationValue] = useState("");
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
    setConfirmationValue("");
  }, []);

  const confirm = useCallback((nextOptions: ChatConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setConfirmationValue("");
      setOptions(nextOptions);
    });
  }, []);

  const confirmDialogProps: ChatConfirmDialogProps = useMemo(
    () => ({
      open: Boolean(options),
      title: options?.title ?? "",
      description: options?.description,
      confirmLabel: options?.confirmLabel ?? "Confirm",
      cancelLabel: options?.cancelLabel ?? "Cancel",
      variant: options?.variant ?? "warning",
      confirmationText: options?.confirmationText,
      confirmationValue,
      confirmationPlaceholder: options?.confirmationPlaceholder,
      confirmationLabel: options?.confirmationLabel,
      onConfirmationValueChange: setConfirmationValue,
      onConfirm: () => close(true),
      onCancel: () => close(false),
    }),
    [close, confirmationValue, options],
  );

  return {
    confirm,
    confirmDialogProps,
  };
}

export default useChatConfirmDialog;
