"use client";

import { ShieldCheck } from "lucide-react";
import { MeetingToggle } from "../ui/meeting-toggle";

export enum MeetingAutoAdmitToggleVariant {
  LIGHT = "light",
  DARK = "dark",
}

interface MeetingAutoAdmitToggleProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: MeetingAutoAdmitToggleVariant;
}

export function MeetingAutoAdmitToggle({
  checked,
  disabled = false,
  onCheckedChange,
  variant = MeetingAutoAdmitToggleVariant.LIGHT,
}: MeetingAutoAdmitToggleProps) {
  return (
    <MeetingToggle
      checked={checked}
      disabled={disabled}
      icon={ShieldCheck}
      title="Allow join without approval"
      description="Let invited people enter this room without waiting for approval."
      variant={variant === MeetingAutoAdmitToggleVariant.DARK ? "dark" : "light"}
      onCheckedChange={onCheckedChange}
    />
  );
}
