"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxCheckedState = boolean | "indeterminate";

interface CheckboxProps
  extends Omit<
    React.ComponentProps<typeof CheckboxPrimitive.Root>,
    "onCheckedChange" | "checked"
  > {
  checked?: CheckboxCheckedState;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  checked = false,
  disabled,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      data-slot="checkbox"
      className={cn(
        "grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm border border-input bg-background text-primary-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      onCheckedChange={(nextChecked) =>
        onCheckedChange?.(nextChecked === true)
      }
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-items-center text-current"
      >
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
