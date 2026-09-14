"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingDeviceOption } from "../../types/meeting.types";
import { MeetingSelect } from "../ui/meeting-form-controls";

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
  const options =
    devices.length > 0
      ? devices.map((device) => ({
          value: device.deviceId,
          label: device.label,
        }))
      : [{ value: "", label: "No device", disabled: true }];

  return (
    <div
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
        <MeetingSelect
          value={value}
          options={options}
          disabled={isDisabled}
          onChange={onChange}
          ariaLabel={label}
          placeholder={displayLabel}
          triggerClassName={cn(
            "mt-1 h-5 border-0 bg-transparent px-0 py-0 text-sm font-black shadow-none hover:bg-transparent focus:ring-0 data-[state=open]:ring-0 [&>svg]:right-0",
            isDisabled && "text-slate-400",
          )}
        />
      </span>
    </div>
  );
}
