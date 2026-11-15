"use client";

import { Fragment, useId } from "react";
import {
  Check,
  ChevronRight,
  FolderOpen,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { CollectionPagination } from "@/components/ui/collection-pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { formatFileSize } from "@/lib/format-file-size";

import {
  useNotebookDocumentPicker,
  NOTEBOOK_DOCUMENT_PAGE_SIZE,
  type NotebookDocumentPickerProps,
} from "../hooks/use-notebook-document-picker";
export function NotebookDocumentPicker(props: NotebookDocumentPickerProps) {
  const field = useId();
  const {
    scope,
    setScope,
    folders,
    navigate,
    page,
    setPage,
    search,
    setSearch,
    searching,
    term,
    query,
    locked,
    pending,
    error,
    addedIds,
    selection,
    selected,
    remaining,
    toggle,
    add,
    disabled,
    reasonFor,
  } = useNotebookDocumentPicker(props);

  return (
    <section aria-label="Choose document sources" className="min-w-0 space-y-3">
      <Tabs
        value={scope}
        onValueChange={(value) => {
          setScope(value);
          navigate([]);
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="mine" className="flex-1" disabled={locked}>
            My files
          </TabsTrigger>
          <TabsTrigger value="shared" className="flex-1" disabled={locked}>
            Shared with me
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <SearchInput
        aria-label="Search documents"
        placeholder="Search documents..."
        value={search}
        disabled={locked}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        onClear={() => {
          setSearch("");
          setPage(1);
        }}
      />
      <Breadcrumb aria-label="Document location">
        <BreadcrumbList>
          <BreadcrumbItem>
            {folders.length ? (
              <Button
                variant="unstyled"
                className="text-xs text-link"
                disabled={locked}
                onClick={() => navigate([])}
              >
                {scope === "mine" ? "My files" : "Shared with me"}
              </Button>
            ) : (
              <BreadcrumbPage className="text-xs">
                {scope === "mine" ? "My files" : "Shared with me"}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {folders.map((folder, index) => (
            <Fragment key={folder.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                {index === folders.length - 1 ? (
                  <BreadcrumbPage className="break-words text-xs">
                    {folder.name}
                  </BreadcrumbPage>
                ) : (
                  <Button
                    variant="unstyled"
                    className="break-words text-left text-xs text-link whitespace-normal"
                    disabled={locked}
                    onClick={() => navigate(folders.slice(0, index + 1))}
                  >
                    {folder.name}
                  </Button>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div
        className="max-h-[min(22rem,40dvh)] min-h-28 overflow-y-auto rounded-panel border border-border"
        aria-busy={query.isFetching || searching}
      >
        {query.isPending || searching ? (
          <LoadingState label="Loading documents..." className="p-5" />
        ) : query.isError ? (
          <div role="alert" className="space-y-2 p-4 text-sm">
            <p>Unable to load documents.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : !query.data?.data.length ? (
          <div className="space-y-2 p-6 text-center text-sm text-muted-foreground">
            <FolderOpen className="mx-auto size-6" aria-hidden="true" />
            <p>{term ? "No matching documents" : "This folder is empty"}</p>
          </div>
        ) : (
          query.data.data.map((document) => {
            const isFolder = document.type === DocumentItemType.FOLDER;
            const isAdded = addedIds.has(document.id);
            const checked = selection.has(document.id) && !isAdded;
            const reason =
              !isFolder && !checked && !isAdded ? reasonFor(document) : "";

            return (
              <div
                key={document.id}
                className={`flex min-w-0 items-center gap-3 border-b border-border p-3 last:border-0 ${checked ? "bg-primary-soft/40" : "bg-card"}`}
              >
                {isFolder ? (
                  <Button
                    variant="unstyled"
                    className="flex w-full min-w-0 items-center gap-3 text-left"
                    disabled={locked}
                    onClick={() =>
                      navigate([
                        ...folders,
                        { id: document.id, name: document.name },
                      ])
                    }
                  >
                    <DocumentIcon
                      item={document}
                      iconSize={20}
                      className="size-9 rounded-control"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {document.name}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Button>
                ) : (
                  <>
                    <Checkbox
                      id={`${field}-${document.id}`}
                      checked={checked || isAdded}
                      disabled={locked || isAdded || Boolean(reason)}
                      aria-label={`Select ${document.name}`}
                      onCheckedChange={() => toggle(document)}
                    />
                    <DocumentIcon
                      item={document}
                      iconSize={20}
                      className="size-9 rounded-control"
                    />
                    <label
                      htmlFor={`${field}-${document.id}`}
                      className="min-w-0 flex-1 cursor-pointer"
                      title={reason || document.name}
                    >
                      <span className="block truncate text-sm font-medium">
                        {document.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatFileSize(document.sizeBytes)}
                        {reason && <span className="sr-only">{reason}</span>}
                      </span>
                    </label>
                    {isAdded && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-success-content">
                        <Check className="size-3.5" aria-hidden="true" />
                        Added
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      {query.data && !query.isError && (
        <CollectionPagination
          page={page}
          limit={NOTEBOOK_DOCUMENT_PAGE_SIZE}
          total={query.data.meta.totalItems}
          totalPages={query.data.meta.totalPages}
          disabled={locked || searching}
          onPageChange={(value) => {
            if (!locked) setPage(value);
          }}
        />
      )}
      {selected.length > 0 && (
        <div aria-label="Selected documents" className="flex flex-wrap gap-2">
          {selected.map((document) => (
            <Button
              key={document.id}
              variant="outline"
              size="sm"
              className="max-w-full"
              disabled={locked}
              onClick={() => toggle(document)}
              aria-label={`Deselect ${document.name}`}
            >
              <span className="max-w-40 truncate">{document.name}</span>
              <X aria-hidden="true" />
            </Button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive-content">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {selected.length} selected · {remaining} remaining
        </p>
        <Button
          loading={pending}
          disabled={disabled || !selected.length || selected.length > remaining}
          onClick={() => void add()}
        >
          <Plus aria-hidden="true" />
          Add selected{selected.length ? ` (${selected.length})` : ""}
        </Button>
      </div>
    </section>
  );
}
