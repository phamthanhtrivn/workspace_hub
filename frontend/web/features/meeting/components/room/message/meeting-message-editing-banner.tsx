"use client";

import { X } from "lucide-react";
import type { MeetingMessageResponse } from "../../../types/meeting.types";
import { MeetingIconButton } from "../../ui/meeting-icon-button";

export function MeetingMessageEditingBanner({
  editingMessage,
  onCancel,
}: {
  editingMessage: MeetingMessageResponse;
  onCancel: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-100">
      <div className="min-w-0 flex-1 border-l-2 border-sky-300 pl-2">
        <span className="block">Editing message</span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-sky-100/70">
          {editingMessage.content}
        </span>
      </div>
      <MeetingIconButton
        label="Cancel"
        icon={X}
        onClick={onCancel}
        className="size-7 text-sky-100 hover:bg-white/10"
      />
    </div>
  );
}
