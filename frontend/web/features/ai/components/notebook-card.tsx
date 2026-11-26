"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { CollectionView } from "@/components/common/collection-view-toggle";
import type {
  NotebookListItem,
  NotebookDialogAction,
} from "../types/notebook-list";
import { notebookThemes } from "../types/notebook-presentation";
import {
  NotebookIcon,
  NotebookCategory,
  NotebookCounts,
} from "./notebook-identity";
import { NotebookActionsMenu } from "./notebook-actions-menu";

export function NotebookCard({
  notebook,
  onAction,
  view = "grid",
}: {
  notebook: NotebookListItem;
  onAction: (action: NotebookDialogAction) => void;
  view?: CollectionView;
}) {
  useAccountTimezone();
  const updated = new Date(notebook.updated_at);
  const validDate = !Number.isNaN(updated.getTime());
  const theme = notebookThemes[notebook.color_theme ?? "navy"];
  const list = view === "list";
  const timestamp = (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
      <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Updated{" "}
        {validDate ? (
          <time
            dateTime={notebook.updated_at}
            title={formatInTimezone(updated, "en-US", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          >
            {formatInTimezone(updated, "en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        ) : (
          "recently"
        )}
      </span>
    </span>
  );

  return (
    <article
      className={cn(
        "group relative min-w-0 rounded-panel border border-border bg-card text-card-foreground transition-colors hover:border-primary/50",
        list
          ? "flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:px-5"
          : "flex h-full flex-col",
      )}
    >
      <Link
        href={`/ai/notebooks/${notebook.id}`}
        aria-label={`Open ${notebook.title}`}
        className="absolute inset-0 rounded-panel outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      {!list && (
        <div
          aria-hidden="true"
          className={cn("h-1.5 shrink-0 rounded-t-panel", theme.strip)}
        />
      )}
      {list ? (
        <>
          <NotebookIcon theme={notebook.color_theme} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="min-w-0 truncate text-sm font-semibold group-hover:text-link"
                title={notebook.title}
              >
                {notebook.title}
              </h2>
              <NotebookCategory
                category={notebook.category}
                theme={notebook.color_theme}
              />
            </div>
            {notebook.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {notebook.description}
              </p>
            )}
            <NotebookCounts
              sources={notebook.sources_count}
              notes={notebook.notes_count}
              className="sm:hidden"
            />
            <div className="xl:hidden">{timestamp}</div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <NotebookCounts
              sources={notebook.sources_count}
              notes={notebook.notes_count}
            />
          </div>
          <div className="hidden shrink-0 xl:block">{timestamp}</div>
          <NotebookActionsMenu notebook={notebook} onAction={onAction} />
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col p-5">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <NotebookIcon theme={notebook.color_theme} />
                <NotebookCategory
                  category={notebook.category}
                  theme={notebook.color_theme}
                />
              </div>
              <NotebookActionsMenu notebook={notebook} onAction={onAction} />
            </div>
            <h2
              className="line-clamp-2 text-base font-semibold group-hover:text-link [overflow-wrap:anywhere]"
              title={notebook.title}
            >
              {notebook.title}
            </h2>
            <p className="mt-1.5 mb-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]">
              {notebook.description ||
                "Add documents, ask questions, and keep your research notes together."}
            </p>
            <NotebookCounts
              sources={notebook.sources_count}
              notes={notebook.notes_count}
              className="mt-auto border-t border-border pt-3.5"
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-b-panel border-t border-border bg-muted/40 px-5 py-3">
            {timestamp}
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 shrink-0 text-link"
            />
          </div>
        </>
      )}
    </article>
  );
}
