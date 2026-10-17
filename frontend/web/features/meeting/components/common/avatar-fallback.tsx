"use client";

import type { CSSProperties } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarFallbackProps {
  label: string;
  className?: string;
  iconClassName?: string;
  style?: CSSProperties;
}

export function AvatarFallback({
  label,
  className,
  iconClassName,
  style,
}: AvatarFallbackProps) {
  return (
    <span
      aria-label={label}
      role="img"
      style={style}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/90 ring-1 ring-border/14",
        className,
      )}
    >
      <User className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
    </span>
  );
}
