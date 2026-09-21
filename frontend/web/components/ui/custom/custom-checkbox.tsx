"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CustomCheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  checkboxClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
}

export function CustomCheckbox({
  checked = false,
  onCheckedChange,
  label,
  description,
  error,
  disabled = false,
  id,
  className,
  checkboxClassName,
  labelClassName,
  descriptionClassName,
}: CustomCheckboxProps) {
  const generatedId = React.useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Checkbox
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className={checkboxClassName}
      />
      {label || description || error ? (
        <div className="min-w-0 flex-1">
          {label ? (
            <label
              htmlFor={checkboxId}
              className={cn(
                "block cursor-pointer text-xs font-bold text-slate-800",
                disabled && "cursor-default opacity-60",
                labelClassName,
              )}
            >
              {label}
            </label>
          ) : null}
          {description ? (
            <p
              className={cn(
                "mt-0.5 text-[11px] leading-relaxed text-slate-500",
                disabled && "opacity-60",
                descriptionClassName,
              )}
            >
              {description}
            </p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[11px] font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
