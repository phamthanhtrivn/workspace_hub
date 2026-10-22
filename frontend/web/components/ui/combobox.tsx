"use client";

import type { ComponentProps } from "react";
import { Combobox as Primitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";
import { POPUP_LAYER_CLASS } from "./popup-layer";

export const Combobox = Primitive.Root;
export const ComboboxTrigger = Primitive.Trigger;
export const ComboboxList = Primitive.List;
export const ComboboxEmpty = Primitive.Empty;
export const ComboboxItemIndicator = Primitive.ItemIndicator;

export function ComboboxInput({ className, unstyled = false, ...props }: Omit<ComponentProps<typeof Primitive.Input>, "className"> & { className?: string; unstyled?: boolean }) {
  return <Primitive.Input data-slot="combobox-input" className={cn(unstyled ? "min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "h-9 w-full min-w-0 rounded-control border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
export function ComboboxContent({ className, ...props }: Omit<ComponentProps<typeof Primitive.Popup>, "className"> & { className?: string }) {
  return <Primitive.Portal><Primitive.Positioner sideOffset={4} className={cn(POPUP_LAYER_CLASS, "max-w-[calc(100vw-1rem)]")}><Primitive.Popup data-slot="combobox-content" className={cn("max-h-[min(20rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-panel border border-border bg-popover p-1 text-sm text-popover-foreground shadow-panel", className)} {...props} /></Primitive.Positioner></Primitive.Portal>;
}
export function ComboboxItem({ className, ...props }: Omit<ComponentProps<typeof Primitive.Item>, "className"> & { className?: string }) {
  return <Primitive.Item data-slot="combobox-item" className={cn("flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 outline-none data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props} />;
}
