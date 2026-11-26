import { Grid, List, MoreHorizontal, Plus, Clock3 } from "lucide-react";
import {
  NotebookIcon,
  NotebookCategory,
  NotebookCounts,
} from "@/features/ai/components/notebook-identity";
import { notebookThemes } from "@/features/ai/types/notebook-presentation";
import { PreviewAction, PreviewBadge, PreviewSearch } from "./preview-ui";

export function NotebookLibraryExample() {
  return (
    <section
      aria-label="Sample notebook library"
      className="mb-6 space-y-4 border-b border-border pb-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-lg font-semibold">
          Your notebooks <PreviewBadge>1</PreviewBadge>
        </h4>
        <PreviewAction variant="default">
          <Plus aria-hidden="true" />
          New notebook
        </PreviewAction>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1">
          <PreviewSearch placeholder="Search by title, category, or description…" />
        </div>
        <PreviewAction>
          <Grid aria-hidden="true" />
          <List aria-hidden="true" />
          Grid / List
        </PreviewAction>
      </div>
      <div className="grid gap-4 @min-[700px]/preview-module:grid-cols-2">
        <article className="min-w-0 rounded-panel border border-border bg-card">
          <div
            className={`h-1.5 rounded-t-panel ${notebookThemes.navy.strip}`}
          />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2.5">
              <NotebookIcon />
              <NotebookCategory category="Academic" />
              <MoreHorizontal
                aria-hidden="true"
                className="ml-auto size-4 text-muted-foreground"
              />
            </div>
            <h5 className="font-semibold">Prototype research</h5>
            <p className="text-xs leading-5 text-muted-foreground">
              Research briefs and interview findings for the graduation project.
            </p>
            <NotebookCounts
              sources={2}
              notes={1}
              className="border-t border-border pt-3"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-b-panel border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Updated Nov 24, 2026
          </div>
        </article>
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-border p-5 text-center">
          <Plus
            aria-hidden="true"
            className="size-6 text-primary-soft-foreground"
          />
          <p className="text-sm font-semibold">Create new notebook</p>
          <p className="text-xs text-muted-foreground">
            Collect documents and start a new research space.
          </p>
        </div>
      </div>
    </section>
  );
}
