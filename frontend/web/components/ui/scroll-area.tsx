"use client";

import type { ComponentProps } from "react";
import { ScrollArea as Primitive } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

type ScrollAreaProps = Omit<ComponentProps<typeof Primitive.Root>, "className"> & {
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  viewportProps?: Omit<ComponentProps<typeof Primitive.Viewport>, "children" | "className">;
  scrollbars?: "vertical" | "horizontal" | "both";
};

function ScrollArea({
  className, children, viewportClassName, contentClassName, viewportProps,
  scrollbars = "vertical", ...props
}: ScrollAreaProps) {
  return (
    <Primitive.Root data-slot="scroll-area" className={cn("group/scroll-area relative min-h-0 min-w-0 overflow-hidden", className)} {...props}>
      <Primitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn("size-full overscroll-contain rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", viewportClassName)}
        {...viewportProps}
      >
        <Primitive.Content data-slot="scroll-area-content" className={cn("min-w-0", contentClassName)} style={{ minWidth: 0 }}>
          {children}
        </Primitive.Content>
      </Primitive.Viewport>
      {scrollbars !== "horizontal" && <ScrollBar />}
      {scrollbars !== "vertical" && <ScrollBar orientation="horizontal" />}
      <Primitive.Corner />
    </Primitive.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: Omit<ComponentProps<typeof Primitive.Scrollbar>, "className"> & { className?: string }) {
  return (
    <Primitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "z-10 flex touch-none select-none p-0.5 opacity-0 data-[hovering]:opacity-100 data-[scrolling]:opacity-100 group-focus-within/scroll-area:opacity-100 motion-safe:transition-opacity motion-safe:duration-150",
        orientation === "vertical" ? "w-2.5" : "h-2.5 flex-col",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/60" />
    </Primitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
