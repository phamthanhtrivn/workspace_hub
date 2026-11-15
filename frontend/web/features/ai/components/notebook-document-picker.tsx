"use client";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentsApi } from "@/features/documents/api/documents.api";
import { useAppSelector } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import { uploadError } from "../upload";
import { LoadingState } from "@/components/ui/loading-state";
export function NotebookDocumentPicker({
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
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      shared
        ? documentsApi.getSharedDocuments(
            { page, limit: 10, search: term },
            signal,
          )
        : documentsApi.getDocuments(
            {
              folderId,
              page,
              limit: 10,
              search: term,
            },
            signal,
          ),
    retry: false,
    gcTime: 0,
  });
  const adding = useRef(false);
  const add = async (documentId: string) => {
    if (adding.current || pending || disabled) return;
    adding.current = true;
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
      adding.current = false;
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
