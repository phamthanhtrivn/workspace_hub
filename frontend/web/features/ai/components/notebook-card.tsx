"use client";

import Link from "next/link";
import { BookOpen, Clock3, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type {
  NotebookListItem,
  NotebookDialogAction,
} from "../types/notebook-list";

export function NotebookCard({
  notebook,
  onAction,
}: {
  notebook: NotebookListItem;
  onAction: (action: NotebookDialogAction) => void;
}) {
  const updated = new Date(notebook.updated_at);
  const validDate = !Number.isNaN(updated.getTime());

  return (
    <article className="group relative flex min-w-0 flex-col gap-4 rounded-panel border border-border bg-card p-5 text-card-foreground transition-colors hover:border-primary/50 hover:bg-accent/30">
      <Link
        href={`/ai/notebooks/${notebook.id}`}
        aria-label={`Open ${notebook.title}`}
        className="absolute inset-0 rounded-panel outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-primary-soft text-primary-soft-foreground">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={`Actions for ${notebook.title}`}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="w-full"
              onClick={() => onAction({ type: "rename", notebook })}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="w-full text-destructive-content data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-content"
              onClick={() => onAction({ type: "delete", notebook })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h2 className="min-h-12 line-clamp-2 text-base font-semibold [overflow-wrap:anywhere]">
        {notebook.title}
      </h2>
      <p className="mt-auto flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
        <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Updated{" "}
          {validDate ? (
            <time
              dateTime={notebook.updated_at}
              title={updated.toLocaleString("en-US")}
            >
              {updated.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          ) : (
            "recently"
          )}
        </span>
      </p>
    </article>
  );
}
