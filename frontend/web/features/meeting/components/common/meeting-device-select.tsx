"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingDeviceOption } from "../../types/meeting.types";

interface MeetingDeviceSelectProps {
  id: string;
  label: string;
  value: string;
  devices: MeetingDeviceOption[];
  icon: LucideIcon;
  disabled?: boolean;
  onChange: (deviceId: string) => void;
}

export function MeetingDeviceSelect({
  id,
  label,
  value,
  devices,
  icon: Icon,
  disabled = false,
  onChange,
}: MeetingDeviceSelectProps) {
  const isDisabled = disabled || devices.length === 0;
  const selectedDevice = devices.find((device) => device.deviceId === value);
  const displayLabel = selectedDevice?.label ?? devices[0]?.label ?? "No device";

  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex h-[68px] min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-within:border-[#0052CC] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0052CC]/10",
        isDisabled && "cursor-not-allowed bg-slate-50 opacity-70 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 transition group-focus-within:bg-blue-50 group-focus-within:text-[#0052CC]",
          isDisabled && "text-slate-400",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative min-w-0 flex-1 pr-7">
        <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 block max-w-full truncate text-sm font-black leading-5 text-[#172B4D]",
            isDisabled && "text-slate-400",
          )}
        >
          {displayLabel}
        </span>
        <select
          id={id}
          value={value}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 outline-none disabled:cursor-not-allowed"
          aria-label={label}
        >
          {devices.map((device) => (
            <option key={device.deviceId || id} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#0052CC]",
            isDisabled && "text-slate-300",
          )}
        />
      </span>
    </label>
  );
}
