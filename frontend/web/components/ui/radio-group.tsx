"use client";

import type { ComponentProps } from "react";
import { RadioGroup as Group } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";

export function RadioGroup<Value extends string>({ className, ...props }: Omit<Group.Props<Value>, "className"> & { className?: string }) {
  return <Group data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />;
}

export function RadioGroupItem({ className, children, ...props }: Omit<Radio.Root.Props<string>, "className"> & { className?: string }) {
  return <Radio.Root data-slot="radio-group-item" className={cn("grid size-4 shrink-0 cursor-pointer place-items-center rounded-full border border-input bg-background text-link outline-none focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50", className)} {...props}>
    {children ?? <Radio.Indicator className="size-2 rounded-full bg-current" />}
  </Radio.Root>;
}

/** Native event adapter for forms whose radio changes already own domain state. */
export function NativeRadio({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return <input type="radio" data-slot="radio" className={cn("cursor-pointer accent-link disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
