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
        "grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm border border-input bg-background text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
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

/** Native form adapter for existing ChangeEvent/ref and peer selector contracts. */
function NativeCheckbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return <input type="checkbox" data-slot="checkbox" className={cn("cursor-pointer accent-link disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}

export { Checkbox, NativeCheckbox };
