"use client";

import { aiErrorMessage } from "@/lib/ai-feedback";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { requestAttachmentSummary } from "../../api/attachment-summary.api";
import type { ChatMessageResponse } from "../../types/chat.types";

export function useAttachmentSummary(message: ChatMessageResponse) {
  const pending = useRef(false);
  const [isRequesting, setIsRequesting] = useState(false);
  async function summarize(file: { id: string; name: string }) {
    if (pending.current) return;
    pending.current = true;
    setIsRequesting(true);
    try {
      await requestAttachmentSummary(message, file);
      toast.success("Summary requested. The result will appear in this conversation.");
    } catch (error: unknown) {
      toast.error(aiErrorMessage(error, "Unable to request a summary. Try again."));
    } finally {
      pending.current = false;
      setIsRequesting(false);
    }
  }
  return { summarize, isRequesting };
}
