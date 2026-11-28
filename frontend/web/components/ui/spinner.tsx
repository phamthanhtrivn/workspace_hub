import { forwardRef } from "react";
import { Loader2, type LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SpinnerProps extends LucideProps {
  tone?: "primary" | "inherit";
}

/** Decorative indicator: the containing status or control supplies its label. */
export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(function Spinner(
  { size = 16, tone = "primary", className, style, ...props },
  ref,
) {
  return (
    <Loader2
      {...props}
      ref={ref}
      size={size}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
      focusable="false"
      data-slot="spinner"
      className={cn(
        "shrink-0 motion-safe:animate-spin",
        tone === "primary" ? "text-loading" : "text-current",
        className,
      )}
    />
  );
});
