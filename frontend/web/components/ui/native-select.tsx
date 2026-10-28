import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { FIELD_FOCUS_CLASS_NAMES, type FieldFocusMode } from "./field-focus";

/** Keeps native select/change-event semantics for browser and device pickers. */
export function NativeSelect({ className, unstyled = false, focusMode = "self", ...props }: ComponentProps<"select"> & { unstyled?: boolean; focusMode?: FieldFocusMode }) {
  return <select data-slot="native-select" className={cn(
    "min-w-0 cursor-pointer disabled:cursor-not-allowed",
    !unstyled && "h-9 rounded-control border border-input bg-background px-3 text-sm text-foreground",
    className,
    FIELD_FOCUS_CLASS_NAMES[focusMode],
  )} {...props} />;
}
