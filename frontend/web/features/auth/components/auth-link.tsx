"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAuthInteraction } from "./auth-interaction-provider";
import { cn } from "@/lib/utils";

export function AuthLink({ onClick, onAuxClick, className, tabIndex, ...props }: ComponentProps<typeof Link>) {
  const { busy, isLocked } = useAuthInteraction();
  return (
    <Link
      {...props}
      className={cn(className, "aria-disabled:cursor-not-allowed aria-disabled:opacity-50")}
      inert={busy || undefined}
      aria-disabled={busy || undefined}
      tabIndex={busy ? -1 : tabIndex}
      onClick={(event) => {
        if (isLocked()) { event.preventDefault(); return; }
        onClick?.(event);
      }}
      onAuxClick={(event) => {
        if (isLocked()) { event.preventDefault(); return; }
        onAuxClick?.(event);
      }}
    />
  );
}
