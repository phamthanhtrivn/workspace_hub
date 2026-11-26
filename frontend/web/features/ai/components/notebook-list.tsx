"use client";

import { useState } from "react";
import { BookOpen, Plus, Search, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { CollectionPagination } from "@/components/ui/collection-pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import {
  CollectionViewToggle,
  type CollectionView,
} from "@/components/common/collection-view-toggle";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";
import { useNotebookList } from "../hooks/use-notebook-list";
import {
  notebookSortOptions,
  type NotebookDialogAction,
} from "../types/notebook-list";
import { NotebookCard } from "./notebook-card";
import { NotebookDialog } from "./notebook-dialog";
import { CreateNotebookCard } from "./create-notebook-card";

export function NotebookList() {
  const userId = useAppSelector((state) => state.auth.userId);

  return userId ? (
    <NotebookLibrary key={userId} userId={userId} />
  ) : (
    <LoadingState label="Loading notebooks..." className="p-6" />
  );
}

function NotebookLibrary({ userId }: { userId: string }) {
  const {
    query,
    filters,
    setSearch,
    setSort,
    setPage,
    clear,
    hasFilters,
    searching,
  } = useNotebookList(userId);
  const [action, setAction] = useState<NotebookDialogAction | null>(null);
  const [view, setView] = useState<CollectionView>("grid");
  const meta = query.data?.meta;

  return (
    <section
      aria-label="Your notebooks"
      className="@container/notebook-library w-full min-w-0 space-y-6 p-4 md:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-page-title font-semibold">Your notebooks</h1>
            {meta && (
              <Badge
                variant="secondary"
                className="tabular-nums"
                aria-label={`${meta.totalNotebooks} notebooks`}
              >
                {meta.totalNotebooks}
              </Badge>
            )}
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            Ask questions about your documents and keep notes. Only you can
            access your notebooks.
          </p>
        </div>
        <Button onClick={() => setAction({ type: "create" })}>
          <Plus aria-hidden="true" />
          New notebook
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 basis-full sm:min-w-48 sm:flex-1 sm:basis-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search notebooks"
            placeholder="Search by title, category, or description..."
            value={filters.search}
            maxLength={200}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <CustomSelect
          ariaLabel="Sort notebooks"
          value={filters.sort}
          onChange={setSort}
          options={[...notebookSortOptions]}
          className="min-w-0 flex-1 sm:w-56 sm:flex-none"
        />
        <CollectionViewToggle
          ariaLabel="Notebook view"
          value={view}
          onChange={setView}
        />
        {hasFilters && (
          <Button variant="outline" onClick={clear}>
            <X aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>
      <div aria-busy={query.isFetching || searching}>
        {query.isPending ? (
          <LoadingState
            label="Loading notebooks..."
            layout="centered"
            className="py-12"
          />
        ) : query.isError ? (
          <div
            role="alert"
            className="space-y-3 rounded-panel border border-border p-6"
          >
            <p className="text-sm">
              Unable to load your notebooks. Please try again.
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : !query.data?.data.length ? (
          <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-border px-5 py-12 text-center">
            <BookOpen
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="font-semibold">
              {filters.search ? "No matching notebooks" : "No notebooks yet"}
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              {filters.search
                ? "Try a different name or clear your filters."
                : "Create a notebook to collect your documents and start asking questions."}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                filters.search ? clear() : setAction({ type: "create" })
              }
            >
              {filters.search ? (
                <X aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {filters.search ? "Clear filters" : "Create notebook"}
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              view === "grid"
                ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-5 p-0.5"
                : "flex flex-col gap-2 p-0.5",
            )}
          >
            {query.data.data.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                onAction={setAction}
                view={view}
              />
            ))}
            {view === "grid" && (
              <CreateNotebookCard
                onClick={() => setAction({ type: "create" })}
              />
            )}
          </div>
        )}
      </div>
      {!query.isError && meta && (
        <CollectionPagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          showSinglePage
        />
      )}
      {action && (
        <NotebookDialog
          key={
            action.type === "create"
              ? "create"
              : `${action.type}:${action.notebook.id}`
          }
          userId={userId}
          action={action}
          onClose={() => setAction(null)}
        />
      )}
    </section>
  );
}
