"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateNotebookCard({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="unstyled"
      onClick={onClick}
      className="group flex min-h-64 flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary-soft/30"
    >
      <span className="grid size-11 place-items-center rounded-control border border-border bg-card text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold">Create new notebook</span>
      <span className="max-w-52 text-xs leading-5 text-muted-foreground">
        Collect documents and start a new research space.
      </span>
    </Button>
  );
}
