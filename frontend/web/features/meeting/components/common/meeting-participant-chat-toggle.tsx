"use client";

import { MessageSquareText } from "lucide-react";
import { MeetingToggle } from "../ui/meeting-toggle";
import { MeetingAutoAdmitToggleVariant } from "./meeting-auto-admit-toggle";

interface MeetingParticipantChatToggleProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: MeetingAutoAdmitToggleVariant;
}

export function MeetingParticipantChatToggle({
  checked,
  disabled = false,
  onCheckedChange,
  variant = MeetingAutoAdmitToggleVariant.LIGHT,
}: MeetingParticipantChatToggleProps) {
  return (
    <MeetingToggle
      checked={checked}
      disabled={disabled}
      icon={MessageSquareText}
      title="Allow participant chat"
      description="Participants can send messages in the meeting chat."
      variant={variant === MeetingAutoAdmitToggleVariant.DARK ? "dark" : "light"}
      onCheckedChange={onCheckedChange}
    />
  );
}
