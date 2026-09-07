"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarSelectOption {
  value: string;
  label: string;
}

interface CalendarSelectProps {
  value: string;
  options: CalendarSelectOption[];
  ariaLabel: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
  popupClassName?: string;
  alignItemWithTrigger?: boolean;
  triggerLabel?: React.ReactNode;
}

export function CalendarSelect({
  value,
  options,
  ariaLabel,
  onChange,
  triggerClassName,
  popupClassName,
  alignItemWithTrigger = true,
  triggerLabel,
}: CalendarSelectProps) {
  return (
    <Select.Root
      value={value}
      items={options}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onChange(nextValue);
      }}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group inline-flex h-9 min-w-24 cursor-pointer items-center justify-between gap-2 rounded-md border-0 border-b-[3px] border-transparent bg-slate-200 px-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-300/80 focus-visible:ring-2 focus-visible:ring-blue-500/35 data-[popup-open]:border-blue-600 data-[popup-open]:bg-slate-300",
          triggerClassName,
        )}
      >
        {triggerLabel === undefined ? (
          <Select.Value />
        ) : (
          <Select.Value>{triggerLabel}</Select.Value>
        )}
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-blue-700 transition-transform group-data-[popup-open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          side="bottom"
          sideOffset={3}
          align="start"
          alignItemWithTrigger={alignItemWithTrigger}
          className="z-[120]"
        >
          <Select.Popup
            className={cn(
              "max-h-[min(24rem,var(--available-height))] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.24)] transition data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              popupClassName,
            )}
          >
            <Select.ScrollUpArrow className="flex h-7 items-center justify-center bg-white text-slate-500">
              <ChevronDown className="h-4 w-4 rotate-180" />
            </Select.ScrollUpArrow>
            <Select.List className="max-h-[21rem] overflow-y-auto py-0.5">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-10 cursor-pointer select-none items-center px-3 outline-none data-[highlighted]:bg-slate-100 data-[selected]:bg-slate-200 data-[selected]:text-slate-900"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow className="flex h-7 items-center justify-center bg-white text-slate-500">
              <ChevronDown className="h-4 w-4" />
            </Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
