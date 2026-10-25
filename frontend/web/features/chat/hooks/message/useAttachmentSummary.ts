"use client";

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
      toast.success("Đã yêu cầu AI tóm tắt. Kết quả sẽ xuất hiện trong cuộc hội thoại này.");
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { message?: unknown } } })?.response;
      const detail = response?.data?.message;
      toast.error(typeof detail === "string" ? detail : "Không gửi được yêu cầu tóm tắt. Vui lòng thử lại.");
    } finally {
      pending.current = false;
      setIsRequesting(false);
    }
  }
  return { summarize, isRequesting };
}
