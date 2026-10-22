"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { POPUP_LAYER_CLASS } from "./popup-layer";

export const DropdownMenu = Menu.Root;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuLabel = Menu.GroupLabel;

export function DropdownMenuTrigger({ asChild, children, ...props }: Menu.Trigger.Props & { asChild?: boolean }) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" render={asChild && React.isValidElement(children) ? children : undefined} {...props}>{asChild ? undefined : children}</Menu.Trigger>;
}

type MenuContentProps = Omit<Menu.Popup.Props, "className"> & {
  className?: string;
  side?: Menu.Positioner.Props["side"];
  align?: Menu.Positioner.Props["align"];
  sideOffset?: number;
};

export function DropdownMenuContent({ className, side = "bottom", align = "end", sideOffset = 6, ...props }: MenuContentProps) {
  return <Menu.Portal><Menu.Positioner side={side} align={align} sideOffset={sideOffset} className={cn(POPUP_LAYER_CLASS, "max-w-[calc(100vw-1rem)]")}>
    <Menu.Popup data-slot="dropdown-menu-content" className={cn("max-h-[var(--available-height)] min-w-40 overflow-y-auto rounded-panel border border-border bg-popover p-1 text-sm text-popover-foreground shadow-panel outline-none", className)} {...props} />
  </Menu.Positioner></Menu.Portal>;
}

export function DropdownMenuItem({ className, ...props }: Omit<Menu.Item.Props, "className"> & { className?: string }) {
  return <Menu.Item render={<Button type="button" variant="unstyled" />} nativeButton data-slot="dropdown-menu-item" className={cn("flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("my-1 border-border", className)} {...props} />;
}
