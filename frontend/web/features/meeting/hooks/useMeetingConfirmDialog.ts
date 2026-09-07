"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  MeetingAlertDialogProps,
  MeetingAlertDialogVariant,
} from "../components/common/meeting-alert-dialog";

interface MeetingConfirmDialogRequest {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: MeetingAlertDialogVariant;
}

export function useMeetingConfirmDialog() {
  const [request, setRequest] = useState<MeetingConfirmDialogRequest | null>(
    null,
  );
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback(
    (nextRequest: MeetingConfirmDialogRequest) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest(nextRequest);
      }),
    [],
  );

  const alertDialogProps = useMemo<MeetingAlertDialogProps>(
    () => ({
      open: Boolean(request),
      title: request?.title ?? "",
      description: request?.description,
      confirmLabel: request?.confirmLabel ?? "",
      cancelLabel: request?.cancelLabel ?? "",
      variant: request?.variant,
      onConfirm: () => close(true),
      onCancel: () => close(false),
    }),
    [close, request],
  );

  return {
    confirm,
    alertDialogProps,
  };
}
