import * as React from "react";

import { cn } from "@/lib/utils";
import { FIELD_FOCUS_CLASS_NAMES, type FieldFocusMode } from "./field-focus";

function Textarea({ className, unstyled = false, focusMode = "self", ...props }: React.ComponentProps<"textarea"> & { unstyled?: boolean; focusMode?: FieldFocusMode }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        unstyled
          ? "min-w-0 disabled:cursor-not-allowed"
          : "min-h-20 w-full rounded-control border border-input aria-invalid:border-destructive-outline bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
        FIELD_FOCUS_CLASS_NAMES[focusMode],
      )}
      {...props}
    />
  );
}

export { Textarea };
