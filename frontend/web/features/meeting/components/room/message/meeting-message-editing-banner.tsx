"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { MeetingMessageResponse } from "../../../types/meeting.types";

export function MeetingMessageEditingBanner({
  editingMessage,
  onCancel,
}: {
  editingMessage: MeetingMessageResponse;
  onCancel: () => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-100">
      <div className="min-w-0 flex-1 border-l-2 border-sky-300 pl-2">
        <span className="block">
          {intl.formatMessage({ id: "meeting.chat.editing" })}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-sky-100/70">
          {editingMessage.content}
        </span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-sky-100 transition hover:bg-white/10"
        aria-label={intl.formatMessage({ id: "app.cancel" })}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
