"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { notebooksApi } from "@/features/ai/api/notebooks.api";
import { Badge } from "@/components/ui/badge";
import {
  DashboardPanel,
  EmptyState,
  QueryFeedback,
} from "../common/dashboard-panel";
import { DASHBOARD_ACCENTS } from "../../constants/dashboard-appearance";

type NotebookPageData = Awaited<ReturnType<typeof notebooksApi.page>>;

const THEME_BAR_CLASS: Record<string, string> = {
  midnight: "bg-wsh-primary",
  ocean: "bg-wsh-primary-hover",
  emerald: "bg-teal-600",
  amber: "bg-amber-500",
  rose: "bg-rose-600",
};

export function DashboardNotebooks({
  query,
}: {
  query: UseQueryResult<NotebookPageData>;
}) {
  const notebooks = query.data?.data.slice(0, 4) ?? [];
  const totalNotebooks = query.data?.meta.totalNotebooks ?? 0;

  return (
    <DashboardPanel
      title="Recent AI Notebooks"
      href="/ai"
      icon={BookOpen}
      iconClassName={DASHBOARD_ACCENTS.notebook}
      description={
        query.isSuccess
          ? `${totalNotebooks} ${totalNotebooks === 1 ? "notebook" : "notebooks"} · Grounded RAG`
          : "Sources, chat & studio notes"
      }
      height="content"
    >
      <QueryFeedback query={query} label="AI notebooks" />
      {query.isSuccess && !notebooks.length && (
        <EmptyState>
          No AI notebooks yet. Open Notebook AI to create your first research
          space.
        </EmptyState>
      )}
      {notebooks.length > 0 && (
        <ul className="space-y-2">
          {notebooks.map((nb) => {
            const barClass =
              THEME_BAR_CLASS[nb.color_theme] ?? "bg-wsh-primary";

            return (
              <li key={nb.id}>
                <Link
                  href={`/ai/notebooks/${encodeURIComponent(nb.id)}`}
                  className="group flex items-center justify-between gap-2.5 rounded-control border border-border bg-card p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`h-7 w-1.5 shrink-0 rounded-full ${barClass}`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-link">
                          {nb.title}
                        </p>
                        {nb.category && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 text-[10px] font-medium"
                          >
                            {nb.category}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                        {nb.sources_count}{" "}
                        {nb.sources_count === 1 ? "source" : "sources"} ·{" "}
                        {nb.notes_count}{" "}
                        {nb.notes_count === 1 ? "note" : "notes"}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-link"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
