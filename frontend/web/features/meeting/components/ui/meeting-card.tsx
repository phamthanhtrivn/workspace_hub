import * as React from "react";

import { cn } from "@/lib/utils";

function MeetingCard({ className, ...props }: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="meeting-card"
      className={cn(
        "rounded-lg border border-border bg-card",
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
        "rounded-lg border border-border bg-card",
        className,
      )}
      {...props}
    />
  );
}

export { MeetingCard, MeetingPanel };
