"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Notebook } from "../types";
import type { NotebookDialogAction } from "../types/notebook-list";
import {
  NotebookIcon,
  NotebookCategory,
  NotebookCounts,
} from "./notebook-identity";
import { NotebookActionsMenu } from "./notebook-actions-menu";

export function NotebookWorkspaceHeader({
  notebook,
  onAction,
  saving,
  busy,
}: {
  notebook: Notebook;
  onAction: (action: NotebookDialogAction) => void;
  saving: boolean;
  busy: boolean;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-5 md:py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link
            href="/ai"
            aria-label="Back to notebooks"
            title="Back to notebooks"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <NotebookIcon theme={notebook.color_theme} className="hidden sm:grid" />
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1
              className="line-clamp-2 text-lg font-semibold [overflow-wrap:anywhere]"
              title={notebook.title}
            >
              {notebook.title}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden="true" />
              Private
            </span>
            <NotebookCategory
              category={notebook.category}
              theme={notebook.color_theme}
            />
          </div>
          {notebook.description && (
            <p className="line-clamp-2 max-w-prose text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {notebook.description}
            </p>
          )}
          <NotebookCounts
            sources={notebook.sources.length}
            notes={notebook.notes.length}
          />
        </div>
      </div>
      <NotebookActionsMenu
        notebook={notebook}
        onAction={onAction}
        disabled={saving}
        deleteDisabled={busy}
      />
    </header>
  );
}
