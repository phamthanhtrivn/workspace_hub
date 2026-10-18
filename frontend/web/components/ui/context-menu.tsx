"use client";

import * as React from "react";
import { ContextMenu as Primitive } from "@base-ui/react/context-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "./dropdown-menu";

export const ContextMenu = Primitive.Root;
export function ContextMenuTrigger({ asChild, children, ...props }: Primitive.Trigger.Props & { asChild?: boolean }) {
  return <Primitive.Trigger data-slot="context-menu-trigger" render={asChild && React.isValidElement(children) ? children : undefined} {...props}>{asChild ? undefined : children}</Primitive.Trigger>;
}
export const ContextMenuContent = DropdownMenuContent;
export const ContextMenuItem = DropdownMenuItem;
export const ContextMenuSeparator = DropdownMenuSeparator;
