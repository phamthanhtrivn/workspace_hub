"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarFallbackProps {
  label: string;
  className?: string;
  iconClassName?: string;
}

export function AvatarFallback({
  label,
  className,
  iconClassName,
}: AvatarFallbackProps) {
  return (
    <span
      aria-label={label}
      role="img"
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200/90 ring-1 ring-white/14 shadow-sm",
        className,
      )}
    >
      <User className={cn("h-5 w-5 text-slate-400", iconClassName)} />
    </span>
  );
}
