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
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-info-outline/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-info-content">
      <div className="min-w-0 flex-1 border-l-2 border-info-outline pl-2">
        <span className="block">Editing message</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-info-content">
          {editingMessage.content}
        </span>
      </div>
      <MeetingIconButton
        label="Cancel"
        icon={X}
        onClick={onCancel}
        className="size-7 text-info-content hover:bg-accent"
      />
    </div>
  );
}
