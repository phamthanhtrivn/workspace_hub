import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, unstyled = false, ...props }: React.ComponentProps<"textarea"> & { unstyled?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        unstyled
          ? "min-w-0 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "min-h-20 w-full rounded-control border border-input aria-invalid:border-destructive-outline bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
