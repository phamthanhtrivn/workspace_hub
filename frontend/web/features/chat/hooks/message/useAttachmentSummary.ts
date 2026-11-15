"use client";

import { aiErrorMessage } from "@/lib/ai-feedback";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  requestAttachmentSummary,
  type AttachmentSummaryReceipt,
} from "../../api/attachment-summary.api";
import { store, useAppSelector } from "@/store/store";
import { NOTIFICATION_RECEIVED_EVENT } from "@/features/notification/utils/notification-category.utils";
import { NotificationType } from "@/features/notification/types/notification.types";
import type { ChatMessageResponse } from "../../types/chat.types";

const ACCESS_EVENTS = new Set<string>([
  NotificationType.DOCUMENT_PERMISSION_UPDATED,
  NotificationType.DOCUMENT_SHARE_REMOVED,
  NotificationType.PROJECT_PERMISSIONS_UPDATED,
  NotificationType.PROJECT_MEMBER_REMOVED,
  NotificationType.SPACE_MEMBER_REMOVED,
  NotificationType.SPACE_DISBANDED,
  NotificationType.CHANNEL_MEMBER_REMOVED,
  NotificationType.CHANNEL_DISBANDED,
]);

export function useAttachmentSummary(message: ChatMessageResponse) {
  const pending = useRef(false);
  const userId = useAppSelector((state) => state.auth.userId);
  const scopeKey = JSON.stringify([
    userId,
    message.id,
    Boolean(message.recalled),
  ]);
  const epoch = useRef(0);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [scopeKey],
  );
  type Completed = {
    file: { id: string; name: string };
    receipt: AttachmentSummaryReceipt;
  };
  const [result, setResult] = useState<{
    scopeKey: string;
    completed: Completed | null;
  }>({ scopeKey, completed: null });
  const completed = result.scopeKey === scopeKey ? result.completed : null;
  if (result.scopeKey !== scopeKey) setResult({ scopeKey, completed: null });
  const setCompleted = useCallback(
    (value: Completed | null) => setResult({ scopeKey, completed: value }),
    [scopeKey],
  );
  const mutation = useMutation({
    mutationKey: [
      "attachment-summary",
      userId,
      message.channelId ?? message.conversationId,
      message.threadParentId ?? null,
    ],
    mutationFn: ({
      file,
      regenerate,
      actionId,
    }: {
      file: { id: string; name: string };
      regenerate: boolean;
      actionId: string;
    }) => requestAttachmentSummary(message, file, { regenerate, actionId }),
    retry: false,
    gcTime: 0,
  });
  const resetMutation = mutation.reset;
  useEffect(() => {
    if (!completed && !mutation.isPending) return;
    const close = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>).detail?.type;
      if (type && ACCESS_EVENTS.has(type)) {
        epoch.current++;
        setCompleted(null);
        resetMutation();
      }
    };
    window.addEventListener(NOTIFICATION_RECEIVED_EVENT, close);

    return () => window.removeEventListener(NOTIFICATION_RECEIVED_EVENT, close);
  }, [completed, mutation.isPending, resetMutation, setCompleted]);
  async function summarize(
    file: { id: string; name: string },
    regenerate = false,
  ) {
    if (pending.current || !userId || message.recalled) return;
    pending.current = true;
    const accessEpoch = epoch.current;
    try {
      const receipt = await mutation.mutateAsync({
        file,
        regenerate,
        actionId: crypto.randomUUID(),
      });
      if (
        epoch.current !== accessEpoch ||
        store.getState().auth.userId !== userId
      )
        return;
      if (receipt.status === "COMPLETED" && receipt.reply) {
        setCompleted({ file, receipt });
      } else if (receipt.status === "FAILED" || receipt.status === "CANCELLED") {
        setCompleted(null);
        toast.error(
          "The previous summary did not complete. Request a new summary to try again.",
        );
      } else {
        setCompleted(null);
        toast.success(
          receipt.reused
            ? "A summary is already processing. Its result will appear in this conversation."
            : "Summary requested. The result will appear in this conversation.",
        );
      }
    } catch (error: unknown) {
      if (
        epoch.current === accessEpoch &&
        store.getState().auth.userId === userId
      ) {
        setCompleted(null);
        resetMutation();
        toast.error(
          aiErrorMessage(error, "Unable to request a summary. Try again."),
        );
      }
    } finally {
      pending.current = false;
    }
  }

  return {
    summarize,
    isRequesting: mutation.isPending,
    completed,
    closeSummary: () => {
      epoch.current++;
      setCompleted(null);
      mutation.reset();
    },
  };
}
