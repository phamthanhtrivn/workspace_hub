"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { notebooksApi } from "../api/notebooks.api";
import type { Source, NotebookActionKey, NotebookActionRunner } from "../types";
import { useSourceUpload } from "../hooks/use-source-upload";
import { sourceFailure } from "../source-failure";
import { AddSourcesDialog, NOTEBOOK_SOURCE_LIMIT } from "./add-sources-dialog";

const statusLabels: Record<string, string> = {
  QUEUED: "Queued",
  INDEXING: "Indexing",
  READY: "Ready",
  FAILED: "Failed",
  UNAVAILABLE: "Unavailable",
};

export function SourcePanel({
  id,
  sources,
  selected,
  toggle,
  busy,
  run,
  pendingAction,
  refresh,
  collapseControl,
  addOpen,
  onAddOpenChange,
}: {
  id: string;
  sources: Source[];
  selected: string[];
  toggle: (id: string) => void;
  busy: boolean;
  run: NotebookActionRunner;
  pendingAction?: NotebookActionKey | null;
  refresh: () => Promise<unknown>;
  collapseControl?: ReactNode;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}) {
  const upload = useSourceUpload(id, sources, refresh);
  const locked = busy || upload.uploading || Boolean(pendingAction);

  return (
    <section
      aria-label="Document sources"
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border p-4">
        <FileText className="size-4 text-link" aria-hidden="true" />
        <h2 className="font-semibold">Sources</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {sources.length}/{NOTEBOOK_SOURCE_LIMIT}
        </span>
        {collapseControl}
      </header>
      <div className="shrink-0 space-y-2 p-3">
        <Button
          variant="outline"
          className="w-full"
          disabled={locked || sources.length >= NOTEBOOK_SOURCE_LIMIT}
          onClick={() => onAddOpenChange(true)}
        >
          <Plus aria-hidden="true" />
          Add sources
        </Button>
        <p className="text-xs text-muted-foreground">
          Select ready sources to use in Chat.
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {!sources.length && (
          <div className="space-y-2 py-6 text-center">
            <FileText
              className="mx-auto size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">No sources yet</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Upload a file or choose from Documents to get started.
            </p>
          </div>
        )}
        {sources.map((source) => {
          const ready = source.status === "READY";
          const indexing = source.status === "INDEXING";
          const failed =
            source.status === "FAILED" || source.status === "UNAVAILABLE";
          const StatusIcon = ready
            ? CheckCircle2
            : failed
              ? AlertCircle
              : Clock3;

          return (
            <article
              key={source.id}
              className={`min-w-0 rounded-control border p-3 ${selected.includes(source.id) ? "border-primary/30 bg-primary-soft/40" : "border-border bg-card"}`}
            >
              <label className="flex items-start gap-2 text-sm font-medium">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={selected.includes(source.id)}
                  disabled={!ready || locked}
                  onCheckedChange={() => toggle(source.id)}
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {source.name}
                </span>
              </label>
              <p
                className={`mt-2 flex items-center gap-1.5 text-xs ${ready ? "text-success-content" : failed ? "text-destructive-content" : "text-muted-foreground"}`}
              >
                <StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {statusLabels[source.status] || source.status}
                {ready && (
                  <span className="text-muted-foreground">
                    · {source.chunk_count} passages
                  </span>
                )}
              </p>
              {indexing && (
                <div className="mt-2 space-y-1.5">
                  <p
                    role="status"
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Spinner size={12} />
                    {source.progress < 40
                      ? "Reading document..."
                      : source.progress < 85
                        ? "Analyzing images..."
                        : "Indexing..."}{" "}
                    {source.progress}%
                  </p>
                  <progress
                    className="h-1 w-full accent-primary"
                    value={source.progress}
                    max={100}
                    aria-label={`Indexing ${source.name}`}
                  />
                </div>
              )}
              {source.error && (
                <p
                  id={`source-error-${source.id}`}
                  className="mt-2 text-xs text-destructive-content [overflow-wrap:anywhere]"
                >
                  {sourceFailure(source.error).message}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {(ready || source.status === "FAILED") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={pendingAction === `retry:${source.id}`}
                    disabled={
                      locked ||
                      (!ready && !sourceFailure(source.error).canRetry)
                    }
                    onClick={() =>
                      run(
                        () => notebooksApi.source(id, source.id, "retry"),
                        `retry:${source.id}`,
                      )
                    }
                  >
                    <RotateCcw aria-hidden="true" />
                    {ready ? "Reindex" : "Retry"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-muted-foreground hover:text-destructive-content"
                  aria-label={`Remove ${source.name}`}
                  title="Remove source"
                  loading={pendingAction === `remove:${source.id}`}
                  disabled={locked}
                  onClick={() =>
                    run(
                      () => notebooksApi.source(id, source.id, "remove"),
                      `remove:${source.id}`,
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="shrink-0 border-t border-border px-4 py-3 text-xs tabular-nums text-muted-foreground">
        {selected.length} ready {selected.length === 1 ? "source" : "sources"}{" "}
        selected
      </p>
      {addOpen && (
        <AddSourcesDialog
          id={id}
          sources={sources}
          upload={upload}
          busy={busy}
          refresh={refresh}
          onClose={() => onAddOpenChange(false)}
        />
      )}
    </section>
  );
}
