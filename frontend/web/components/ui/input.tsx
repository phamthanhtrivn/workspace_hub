import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, unstyled = false, ...props }: React.ComponentProps<"input"> & { unstyled?: boolean }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        unstyled
          ? "min-w-0 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "flex h-9 w-full min-w-0 rounded-control border border-input bg-background px-3 py-1 text-sm text-foreground outline-none transition placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
