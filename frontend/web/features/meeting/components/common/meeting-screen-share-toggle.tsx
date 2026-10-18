"use client";

import { Check, MonitorUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MeetingAutoAdmitToggleVariant } from "./meeting-auto-admit-toggle";
import { NativeCheckbox } from "@/components/ui/checkbox";


interface MeetingScreenShareToggleProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: MeetingAutoAdmitToggleVariant;
}

export function MeetingScreenShareToggle({
  checked,
  disabled = false,
  onCheckedChange,
  variant = MeetingAutoAdmitToggleVariant.LIGHT,
}: MeetingScreenShareToggleProps) {
  const isDark = variant === MeetingAutoAdmitToggleVariant.DARK;

  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition",
        disabled && "cursor-not-allowed opacity-70",
        isDark
          ? "bg-muted ring-1 ring-border/8 hover:bg-muted"
          : "border border-input bg-background hover:border-input hover:bg-info-soft/70",
      )}
    >
      <NativeCheckbox

        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : isDark
              ? "border-input bg-card text-transparent group-hover:border-info-outline"
              : "border-input bg-card text-transparent group-hover:border-primary",
        )}
        aria-hidden="true"
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-start gap-2 text-sm font-semibold leading-5",
            isDark ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <MonitorUp
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              isDark ? "text-info-content" : "text-info-content",
            )}
          />
          Allow screen sharing
        </span>
        <span
          className={cn(
            "mt-1 block text-xs font-semibold leading-5",
            isDark ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          Hosts and co-hosts can manage who shares their screen.
        </span>
      </span>
    </label>
  );
}
