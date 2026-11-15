"use client";
import { useId } from "react";
import { ChevronRight, FolderOpen, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionPagination } from "@/components/ui/collection-pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { formatFileSize } from "@/lib/format-file-size";
import { DocumentIcon } from "../common/document-icon";
import { DocumentItemType } from "../../types/documents.enums";
import { FILE_PICKER_PAGE_SIZE } from "../../api/file-copy.api";
import {
  useFilePicker,
  type FilePickerProps,
} from "../../hooks/use-file-picker";

export function DocumentFilePicker(
  props: FilePickerProps & { confirmLabel?: string },
) {
  const field = useId();
  const picker = useFilePicker(props);
  const label =
    picker.scope === "project"
      ? "Project documents"
      : picker.scope === "personal"
        ? "My files"
        : "Shared with me";
  const rows = picker.query.data?.data ?? [];

  return (
    <section aria-label="Choose files" className="min-w-0 space-y-3">
      {!props.projectId && (
        <Tabs
          value={picker.scope}
          onValueChange={(scope) => {
            if (scope === "personal" || scope === "shared")
              picker.setScope(scope);
            picker.navigate([]);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="personal"
              className="flex-1"
              disabled={picker.locked}
            >
              My files
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="flex-1"
              disabled={picker.locked}
            >
              Shared with me
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <SearchInput
        aria-label="Search files"
        placeholder="Search files..."
        value={picker.search}
        disabled={picker.locked}
        onChange={(event) => {
          picker.setSearch(event.target.value);
          picker.setPage(1);
        }}
        onClear={() => {
          picker.setSearch("");
          picker.setPage(1);
        }}
      />
      <nav
        aria-label="Document location"
        className="flex flex-wrap items-center gap-1 text-xs"
      >
        <Button
          variant="unstyled"
          disabled={picker.locked || !picker.folders.length}
          onClick={() => picker.navigate([])}
          className="text-xs text-link"
        >
          {label}
        </Button>
        {picker.folders.map((folder, index) => (
          <span
            key={folder.id}
            className="inline-flex min-w-0 items-center gap-1"
          >
            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
            <Button
              variant="unstyled"
              disabled={picker.locked || index === picker.folders.length - 1}
              onClick={() =>
                picker.navigate(picker.folders.slice(0, index + 1))
              }
              className="max-w-40 truncate text-xs text-link"
            >
              {folder.name}
            </Button>
          </span>
        ))}
      </nav>
      <div
        className="max-h-[min(22rem,40dvh)] min-h-32 overflow-y-auto overscroll-contain rounded-panel border border-border"
        aria-busy={picker.query.isFetching || picker.searching}
      >
        {picker.query.isPending || picker.searching ? (
          <LoadingState label="Loading files..." className="p-5" />
        ) : picker.query.isError ? (
          <div role="alert" className="space-y-2 p-4 text-sm">
            <p>Unable to load files.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void picker.query.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="grid justify-items-center gap-2 p-6 text-sm text-muted-foreground">
            <FolderOpen className="size-6" aria-hidden="true" />
            No files
          </div>
        ) : (
          rows.map((document) => {
            const folder = document.type === DocumentItemType.FOLDER;
            const checked = picker.selection.has(document.id);
            const added = props.isAdded?.(document) ?? false;
            const reason = checked ? "" : picker.reason(document);

            return (
              <div
                key={document.id}
                className="flex min-w-0 items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
              >
                {(!folder || props.allowFolders) && (
                  <Checkbox
                    id={`${field}-${document.id}`}
                    checked={checked || added}
                    disabled={picker.locked || added || !!reason}
                    aria-label={`Select ${document.name}`}
                    onCheckedChange={() => picker.toggle(document)}
                  />
                )}
                <DocumentIcon
                  item={document}
                  iconSize={20}
                  className="size-9 shrink-0 rounded-control"
                />
                {folder ? (
                  <Button
                    variant="unstyled"
                    disabled={picker.locked}
                    onClick={() =>
                      picker.navigate([
                        ...picker.folders,
                        { id: document.id, name: document.name },
                      ])
                    }
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  >
                    <span className="truncate text-sm font-medium">
                      {document.name}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Button>
                ) : (
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
                      {reason && <span className="sr-only"> · {reason}</span>}
                    </span>
                  </label>
                )}
                {added && (
                  <span className="shrink-0 text-xs text-success-content">
                    Already added
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      {picker.query.data && !picker.query.isError && (
        <CollectionPagination
          page={picker.query.data.meta.page}
          limit={FILE_PICKER_PAGE_SIZE}
          total={picker.query.data.meta.totalItems}
          totalPages={picker.query.data.meta.totalPages}
          disabled={picker.locked || picker.searching}
          onPageChange={picker.setPage}
        />
      )}
      {!!picker.selected.length && (
        <div className="flex flex-wrap gap-2" aria-label="Selected files">
          {picker.selected.map((document) => (
            <Button
              key={document.id}
              size="sm"
              variant="outline"
              className="max-w-full"
              disabled={picker.locked}
              aria-label={`Deselect ${document.name}`}
              onClick={() => picker.toggle(document)}
            >
              <span className="max-w-40 truncate">{document.name}</span>
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          ))}
        </div>
      )}
      {picker.error && (
        <p role="alert" className="text-sm text-destructive-content">
          {picker.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {picker.selected.length} selected
        </span>
        <Button
          loading={picker.pending}
          disabled={picker.locked || !picker.selected.length}
          onClick={() => void picker.confirm()}
        >
          <Plus aria-hidden="true" />
          {props.confirmLabel ?? "Add selected"}
          {picker.selected.length ? ` (${picker.selected.length})` : ""}
        </Button>
      </div>
    </section>
  );
}
