"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";


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
  const label = muted ? "Unmute" : "Mute";
  const Icon = muted ? BellOff : Bell;

  return (
    <Button variant="unstyled"
      type="button"
      disabled={disabled}
      onClick={() => onMutedChange(!muted)}
      aria-label={label}
      title={label}
      className={className}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
