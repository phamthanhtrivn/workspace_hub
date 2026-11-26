"use client";

import { Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CollectionView = "grid" | "list";

const views = [
  { value: "grid", label: "Grid view", icon: Grid },
  { value: "list", label: "List view", icon: List },
] as const;

export function CollectionViewToggle({
  value,
  onChange,
  className,
  ariaLabel = "Collection view",
}: {
  value: CollectionView;
  onChange: (view: CollectionView) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-control border border-border bg-muted p-1",
        className,
      )}
    >
      {views.map(({ value: view, label, icon: Icon }) => (
        <Button
          key={view}
          type="button"
          variant="unstyled"
          aria-label={label}
          title={label}
          aria-pressed={value === view}
          onClick={() => onChange(view)}
          className={cn(
            "relative grid size-7 place-items-center rounded-control border border-transparent transition-colors focus-visible:z-10",
            value === view
              ? "border-border bg-card text-info-content"
              : "text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
