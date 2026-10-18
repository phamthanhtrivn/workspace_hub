"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface CustomSelectOption<TValue extends string = string> {
  value: TValue;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface CustomSelectProps<TValue extends string = string> {
  id?: string;
  value: TValue;
  options: CustomSelectOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

const INTERNAL_EMPTY_VALUE = "__CUSTOM_SELECT_EMPTY__";

export function CustomSelect<TValue extends string = string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  invalid,
  className,
  triggerClassName,
  contentClassName,
}: CustomSelectProps<TValue>) {
  const selectedOption = options.find((option) => option.value === value);
  const internalValue = value === "" ? INTERNAL_EMPTY_VALUE : value;

  return (
    <div className={cn("min-w-0", className)}>
      <Select
        value={internalValue}
        disabled={disabled}
        onValueChange={(nextValue) =>
          onChange((nextValue === INTERNAL_EMPTY_VALUE ? "" : nextValue) as TValue)
        }
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 cursor-pointer rounded-control border-input bg-card px-3 text-sm font-semibold text-foreground hover:bg-background data-[state=open]:border-info-outline data-[state=open]:ring-2 data-[state=open]:ring-ring/15",
            invalid && "border-destructive-outline ring-2 ring-destructive-outline/15",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? <OptionLabel option={selectedOption} /> : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={cn("rounded-control border-border", contentClassName)}>
          {options.map((option) => {
            const itemValue = option.value === "" ? INTERNAL_EMPTY_VALUE : option.value;
            return (
              <SelectItem
                key={itemValue}
                value={itemValue}
                disabled={option.disabled}
                className="min-h-9 rounded-md font-medium"
              >
                <OptionLabel option={option} />
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionLabel<TValue extends string>({
  option,
}: {
  option: CustomSelectOption<TValue>;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.icon ? (
        <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
          {option.icon}
        </span>
      ) : null}
      <span className="truncate">{option.label}</span>
      {typeof option.count === "number" && option.count > 0 ? (
        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-muted px-1 text-xs font-semibold text-muted-foreground">
          {option.count > 99 ? "99+" : option.count}
        </span>
      ) : null}
    </span>
  );
}
