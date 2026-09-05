"use client";

import { Bell, BellOff } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingChatNotificationToggleButtonProps {
  muted: boolean;
  disabled?: boolean;
  onMutedChange: (muted: boolean) => void;
  className: string;
}

export function MeetingChatNotificationToggleButton({
  muted,
  disabled = false,
  onMutedChange,
  className,
}: MeetingChatNotificationToggleButtonProps) {
  const intl = useAppIntl();
  const label = intl.formatMessage({ id: muted ? "chat.unmute" : "chat.mute" });
  const Icon = muted ? BellOff : Bell;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onMutedChange(!muted)}
      aria-label={label}
      title={label}
      className={className}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
