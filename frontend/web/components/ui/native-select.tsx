import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Keeps native select/change-event semantics for browser and device pickers. */
export function NativeSelect({ className, unstyled = false, ...props }: ComponentProps<"select"> & { unstyled?: boolean }) {
  return <select data-slot="native-select" className={cn(
    "min-w-0 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    !unstyled && "h-9 rounded-control border border-input bg-background px-3 text-sm text-foreground",
    className,
  )} {...props} />;
}
