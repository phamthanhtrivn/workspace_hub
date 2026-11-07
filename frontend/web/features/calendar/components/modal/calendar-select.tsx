"use client";

import type { ReactNode } from "react";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

export interface CalendarSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CalendarSelectProps {
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  descriptionId?: string;
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
  disabled,
  invalid,
  descriptionId,
  options,
  ariaLabel,
  onChange,
  triggerClassName,
  popupClassName,
  alignItemWithTrigger = true,
  triggerLabel,
}: CalendarSelectProps) {
  return <CustomSelect
    value={value}
    disabled={disabled}
    invalid={invalid}
    descriptionId={descriptionId}
    options={options}
    ariaLabel={ariaLabel}
    onChange={onChange}
    triggerLabel={triggerLabel}
    triggerClassName={triggerClassName}
    contentClassName={cn(alignItemWithTrigger ? "min-w-[var(--radix-select-trigger-width)]" : "min-w-fit", popupClassName)}
  />;
}
