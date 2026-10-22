"use client";

import type { ComponentProps } from "react";
import { Progress as Primitive } from "@base-ui/react/progress";
import { cn } from "@/lib/utils";

export function Progress({ className, children, value, ...props }: Omit<ComponentProps<typeof Primitive.Root>, "className"> & { className?: string }) {
  const max = props.max ?? 100;
  const min = props.min ?? 0;
  const percentage = value === null ? undefined : Math.min(100, Math.max(0, (value - min) / Math.max(1, max - min) * 100));
  return <Primitive.Root data-slot="progress" value={value} className={cn("overflow-hidden rounded-full bg-muted", className)} {...props}>
    {children ?? <Primitive.Track className="h-1.5 w-full"><Primitive.Indicator className="h-full rounded-full bg-link" style={{ width: percentage === undefined ? "100%" : `${percentage}%` }} /></Primitive.Track>}
  </Primitive.Root>;
}
