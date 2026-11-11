"use client";

import { sourceFailure } from "../source-failure";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { documentsApi } from "@/features/documents/api/documents.api";
import { useAppSelector } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import type { Source } from "../types";
import { useSourceUpload } from "../hooks/use-source-upload";
import { uploadError } from "../upload";
import { LoadingState } from "@/components/ui/loading-state";
import { Spinner } from "@/components/ui/spinner";
import { Details, DetailsSummary } from "@/components/ui/details";
import type { NotebookActionKey, NotebookActionRunner } from "../types";

const states: Record<string, string> = {
  QUEUED: "Queued",
  INDEXING: "Indexing",
  READY: "Ready",
  FAILED: "Failed",
  UNAVAILABLE: "Source unavailable",
};
type Props = {
  id: string;
  sources: Source[];
  selected: string[];
  toggle: (id: string) => void;
  busy: boolean;
  run: NotebookActionRunner;
  pendingAction?: NotebookActionKey | null;
  refresh: () => Promise<unknown>;
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
}: Props) {
  const upload = useRef<HTMLInputElement>(null);
  const [picker, setPicker] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const { uploadFiles, uploading, stage, error } = useSourceUpload(
    id,
    sources,
    refresh,
  );
  const sourceBusy = busy || uploading || pickerBusy;

  return (
    <section
      className="flex h-full flex-col gap-4"
      aria-label="Document sources"
    >
      <header className="flex items-center justify-between">
        <h2 className="font-semibold">Sources</h2>
        <span className="text-xs text-muted-foreground">
          {sources.length}/5 files
        </span>
      </header>
      <div className="grid gap-2">
        <Button
          loading={uploading}
          variant="outline"
          disabled={sourceBusy || sources.length >= 5}
          onClick={() => upload.current?.click()}
        >
          <Upload />
          {stage === "CHECKING"
            ? "Checking file..."
            : stage === "ADDING"
              ? "Adding source..."
              : uploading
                ? "Uploading..."
                : "Upload file"}
        </Button>
        <Button
          variant="outline"
          disabled={sourceBusy || sources.length >= 5}
          onClick={() => setPicker((value) => !value)}
        >
          {picker ? "Close document picker" : "Choose from Documents"}
        </Button>
      </div>
      <input
        hidden
        ref={upload}
        type="file"
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        multiple
        onChange={(event) => {
          void uploadFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <Details className="text-xs leading-relaxed text-muted-foreground">
        <DetailsSummary className="cursor-pointer">
          File types & limits
        </DetailsSummary>
        <p className="mt-2">
          PDF, DOCX, TXT, MD, PNG, JPEG and WebP. Up to 20 MiB per file and 50
          MiB per notebook.
        </p>
        <p className="mt-2">
          PDFs: up to 100 pages. Each file supports up to 100,000 tokens and 24
          scanned pages or images requiring image analysis.
        </p>
      </Details>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {picker && (
        <DocumentPicker
          notebookId={id}
          addedIds={sources.map((source) => source.document_id)}
          onAdded={refresh}
          disabled={busy || uploading}
          onPending={setPickerBusy}
        />
      )}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {!sources.length && (
          <p className="py-8 text-sm text-muted-foreground">
            Upload a file or choose from Documents to get started.
          </p>
        )}
        {sources.map((source) => (
          <article
            key={source.id}
            className={`rounded-lg border p-3 ${selected.includes(source.id) ? "border-primary/30 bg-primary/5" : "bg-background"}`}
          >
            <label className="flex items-start gap-2 text-sm font-medium">
              <Checkbox
                className="mt-1"
                checked={selected.includes(source.id)}
                disabled={source.status !== "READY" || sourceBusy}
                onCheckedChange={() => toggle(source.id)}
              />
              <span className="min-w-0 break-words">{source.name}</span>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {states[source.status] || source.status}
              {source.status === "READY"
                ? ` · ${source.chunk_count} passages`
                : ""}
            </p>
            {source.status === "INDEXING" && (
              <p role="status" className="mt-1 flex items-center gap-2 text-xs">
                <Spinner size={14} />
                {source.progress < 40
                  ? "Reading document and recognizing text..."
                  : source.progress < 85
                    ? "Analyzing images..."
                    : "Indexing..."}
                {` ${source.progress}%`}
              </p>
            )}
            {source.error && (
              <p
                id={`source-error-${source.id}`}
                className="mt-2 break-words text-xs text-destructive"
              >
                {sourceFailure(source.error).message}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              {source.status === "FAILED" && (
                <Button
                  loading={pendingAction === `retry:${source.id}`}
                  size="sm"
                  variant="outline"
                  disabled={sourceBusy || !sourceFailure(source.error).canRetry}
                  aria-describedby={
                    source.error ? `source-error-${source.id}` : undefined
                  }
                  onClick={() =>
                    run(
                      () => notebooksApi.source(id, source.id, "retry"),
                      `retry:${source.id}`,
                    )
                  }
                >
                  Retry
                </Button>
              )}
              {source.status === "READY" && (
                <Button
                  loading={pendingAction === `retry:${source.id}`}
                  size="sm"
                  variant="ghost"
                  disabled={sourceBusy}
                  onClick={() =>
                    run(
                      () => notebooksApi.source(id, source.id, "retry"),
                      `retry:${source.id}`,
                    )
                  }
                >
                  Reindex
                </Button>
              )}
              <Button
                loading={pendingAction === `remove:${source.id}`}
                size="sm"
                variant="ghost"
                disabled={sourceBusy}
                onClick={() =>
                  run(
                    () => notebooksApi.source(id, source.id, "remove"),
                    `remove:${source.id}`,
                  )
                }
              >
                <X />
                Remove source
              </Button>
            </div>
          </article>
        ))}
      </div>
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Selected: {selected.length} ready sources
      </p>
    </section>
  );
}

function DocumentPicker({
  notebookId,
  addedIds,
  onAdded,
  disabled,
  onPending,
}: {
  notebookId: string;
  addedIds: string[];
  onAdded: () => Promise<unknown>;
  disabled: boolean;
  onPending: (value: boolean) => void;
}) {
  const userId = useAppSelector((state) => state.auth.userId);
  const [shared, setShared] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const folderId = folders.at(-1);
  const query = useQuery({
    queryKey: [
      "notebook-document-picker",
      userId,
      shared,
      folderId,
      page,
      term,
    ],
    queryFn: () =>
      shared
        ? documentsApi.getSharedDocuments({ page, limit: 10, search: term })
        : documentsApi.getDocuments({
            folderId,
            page,
            limit: 10,
            search: term,
          }),
    retry: false,
    gcTime: 0,
  });
  const add = async (documentId: string) => {
    if (pending || disabled) return;
    setPending(true);
    setPendingDocumentId(documentId);
    onPending(true);
    setError("");
    try {
      await notebooksApi.add(notebookId, [documentId]);
      await onAdded();
    } catch (cause) {
      setError(uploadError(cause));
    } finally {
      setPending(false);
      setPendingDocumentId(null);
      onPending(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-2">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={!shared ? "outline" : "ghost"}
          onClick={() => {
            setShared(false);
            setFolders([]);
            setPage(1);
          }}
        >
          My files
        </Button>
        <Button
          size="sm"
          variant={shared ? "outline" : "ghost"}
          onClick={() => {
            setShared(true);
            setFolders([]);
            setPage(1);
          }}
        >
          Shared with me
        </Button>
      </div>
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          setTerm(search);
          setPage(1);
        }}
      >
        <Input
          aria-label="Search documents"
          placeholder="File name..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button size="sm" variant="outline">
          Search
        </Button>
      </form>
      {folders.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setFolders((value) => value.slice(0, -1));
            setPage(1);
          }}
        >
          Parent folder
        </Button>
      )}
      {query.isPending && (
        <LoadingState label="Loading documents..." className="text-xs" />
      )}
      {query.isError && (
        <p role="alert" className="text-xs text-destructive">
          Unable to load documents. Try again.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!query.isError &&
        query.data?.data.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-2 border-b py-2 text-xs"
          >
            <span className="min-w-0 break-words">{file.name}</span>
            {file.type === "FOLDER" ? (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Open ${file.name}`}
                disabled={shared}
                onClick={() => {
                  setFolders((value) => [...value, file.id]);
                  setPage(1);
                }}
              >
                <Folder />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                loading={pending && pendingDocumentId === file.id}
                disabled={
                  pending ||
                  disabled ||
                  addedIds.includes(file.id) ||
                  addedIds.length >= 5
                }
                onClick={() => void add(file.id)}
              >
                {addedIds.includes(file.id) ? "Added" : "Add"}
              </Button>
            )}
          </div>
        ))}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <span className="text-xs">{page}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={!query.data?.meta || page >= query.data.meta.totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
