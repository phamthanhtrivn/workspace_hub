import * as React from "react";

import { cn } from "@/lib/utils";
import { FIELD_FOCUS_CLASS_NAMES, type FieldFocusMode } from "./field-focus";

function Input({ className, type, unstyled = false, focusMode = "self", ...props }: React.ComponentProps<"input"> & { unstyled?: boolean; focusMode?: FieldFocusMode }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        unstyled
          ? "min-w-0 disabled:cursor-not-allowed"
          : "flex h-9 w-full min-w-0 rounded-control border border-input aria-invalid:border-destructive-outline bg-background px-3 py-1 text-sm text-foreground outline-none transition placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
        FIELD_FOCUS_CLASS_NAMES[focusMode],
      )}
      {...props}
    />
  );
}

export { Input };
