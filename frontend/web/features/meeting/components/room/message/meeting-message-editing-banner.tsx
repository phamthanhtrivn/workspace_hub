"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export function MeetingMessageEditingBanner({
  onCancel,
}: {
  onCancel: () => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="mb-2 flex items-center justify-between rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-100">
      <span>{intl.formatMessage({ id: "meeting.chat.editing" })}</span>
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
