"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";

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
  const intl = useAppIntl();
  const isDark = variant === MeetingAutoAdmitToggleVariant.DARK;

  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition",
        disabled && "cursor-not-allowed opacity-70",
        isDark
          ? "bg-white/6 ring-1 ring-white/8 hover:bg-white/8"
          : "border border-slate-200 bg-slate-50/80 hover:border-blue-200 hover:bg-blue-50/70",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
          checked
            ? "border-[#0052CC] bg-[#0052CC] text-white shadow-[0_8px_18px_rgba(0,82,204,0.28)]"
            : isDark
              ? "border-white/20 bg-white/8 text-transparent group-hover:border-blue-300"
              : "border-slate-300 bg-white text-transparent group-hover:border-[#0052CC]",
        )}
        aria-hidden="true"
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-start gap-2 text-sm font-black leading-5",
            isDark ? "text-slate-100" : "text-[#172B4D]",
          )}
        >
          <ShieldCheck
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              isDark ? "text-blue-200" : "text-[#0052CC]",
            )}
          />
          {intl.formatMessage({
            id: "meeting.prejoin.allowJoinWithoutApproval",
          })}
        </span>
        <span
          className={cn(
            "mt-1 block text-xs font-semibold leading-5",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          {intl.formatMessage({
            id: "meeting.prejoin.allowJoinWithoutApprovalDescription",
          })}
        </span>
      </span>
    </label>
  );
}
