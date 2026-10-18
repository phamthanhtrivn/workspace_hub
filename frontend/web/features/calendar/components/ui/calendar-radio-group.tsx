"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarRadioOption<TValue extends string = string> {
  value: TValue;
  label: ReactNode;
  disabled?: boolean;
}

interface CalendarRadioGroupProps<TValue extends string = string> {
  value: TValue;
  options: CalendarRadioOption<TValue>[];
  ariaLabel: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
  onChange: (value: TValue) => void;
}

export function CalendarRadioGroup<TValue extends string = string>({
  value,
  options,
  ariaLabel,
  name,
  disabled = false,
  className,
  optionClassName,
  onChange,
}: CalendarRadioGroupProps<TValue>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn("space-y-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const optionDisabled = disabled || option.disabled;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            role="radio"
            aria-checked={selected}
            aria-label={String(option.label)}
            name={name}
            disabled={optionDisabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-auto w-full cursor-pointer items-center justify-start gap-2.5 rounded-control border p-2.5 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-info-outline bg-info-soft/50 text-info-content hover:bg-info-soft/70"
                : "border-border text-foreground hover:bg-background hover:text-foreground",
              optionClassName,
            )}
          >
            <span
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                selected
                  ? "border-info-outline bg-primary text-primary-foreground"
                  : "border-input bg-card",
              )}
              aria-hidden="true"
            >
              {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>
            <span>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

