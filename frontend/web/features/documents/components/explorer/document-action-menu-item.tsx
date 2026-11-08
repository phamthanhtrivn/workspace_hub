"use client";

import type { ComponentProps } from "react";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function DocumentActionMenuItem({
  blockedReason,
  onClick,
  ...props
}: Omit<ComponentProps<typeof DropdownMenuItem>, "disabledReason"> & {
  blockedReason?: string;
}) {
  return (
    <DropdownMenuItem
      {...props}
      onClick={(event) => {
        if (blockedReason) {
          event.stopPropagation();
          toast.info(blockedReason);

          return;
        }
        onClick?.(event);
      }}
    />
  );
}
