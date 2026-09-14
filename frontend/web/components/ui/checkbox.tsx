"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.ComponentProps<"button">, "onChange" | "value"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  checked = false,
  disabled,
  onCheckedChange,
  onClick,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      data-slot="checkbox"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm border border-input bg-background text-primary-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
    </button>
  );
}

export { Checkbox };
