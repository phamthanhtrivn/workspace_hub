import * as React from "react";

import { cn } from "@/lib/utils";

function MeetingCard({ className, ...props }: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="meeting-card"
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

function MeetingPanel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="meeting-panel"
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export { MeetingCard, MeetingPanel };
