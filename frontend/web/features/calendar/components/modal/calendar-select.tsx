"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  triggerLabel?: ReactNode;
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "group inline-flex h-9 min-w-24 cursor-pointer items-center justify-between gap-2 rounded-md border-0 border-b-[3px] border-transparent bg-accent px-3 text-sm font-medium text-foreground shadow-none outline-none transition-colors hover:bg-border/80 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-info data-[state=open]:bg-border [&_svg]:text-info",
          triggerClassName,
        )}
      >
        {triggerLabel === undefined ? (
          <SelectValue />
        ) : (
          <SelectValue>{triggerLabel}</SelectValue>
        )}
      </SelectTrigger>
      <SelectContent
        side="bottom"
        align="start"
        sideOffset={3}
        className={cn(
          "max-h-[min(24rem,var(--radix-select-content-available-height))] rounded-md border-border bg-card py-1 text-sm text-foreground",
          alignItemWithTrigger
            ? "min-w-[var(--radix-select-trigger-width)]"
            : "min-w-fit",
          popupClassName,
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="flex min-h-10 cursor-pointer select-none items-center rounded-none px-3 outline-none data-[highlighted]:bg-muted data-[state=checked]:bg-accent data-[state=checked]:text-foreground"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
