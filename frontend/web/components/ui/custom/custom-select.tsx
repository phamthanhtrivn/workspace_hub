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

export function CustomSelect<TValue extends string = string>({
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

  return (
    <div className={cn("min-w-0", className)}>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 cursor-pointer rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 data-[state=open]:border-blue-300 data-[state=open]:ring-2 data-[state=open]:ring-blue-500/15",
            invalid && "border-red-300 ring-2 ring-red-500/15",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? <OptionLabel option={selectedOption} /> : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={cn("rounded-lg border-slate-200", contentClassName)}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="min-h-9 rounded-md font-medium"
            >
              <OptionLabel option={option} />
            </SelectItem>
          ))}
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
        <span className="grid size-4 shrink-0 place-items-center text-slate-500">
          {option.icon}
        </span>
      ) : null}
      <span className="truncate">{option.label}</span>
      {typeof option.count === "number" && option.count > 0 ? (
        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-black text-slate-600">
          {option.count > 99 ? "99+" : option.count}
        </span>
      ) : null}
    </span>
  );
}
