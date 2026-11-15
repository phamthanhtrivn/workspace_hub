"use client";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/features/documents/api/documents.api";
import type { DocumentItem } from "@/features/documents/types/documents.types";
import { store, useAppSelector } from "@/store/store";
import { useDebouncedValue } from "@/features/chat/hooks/useDebouncedValue";
import { notebooksApi } from "../api/notebooks.api";
import type { Source } from "../types";
import { uploadError } from "../upload";
import {
  NOTEBOOK_SOURCE_LIMIT,
  documentSourceReason,
  validateDocumentSources,
} from "../utils/notebook-source-selection";
export const NOTEBOOK_DOCUMENT_PAGE_SIZE = 10;
export interface NotebookDocumentPickerProps {
  notebookId: string;
  sources: Source[];
  onAdded: () => Promise<unknown>;
  disabled: boolean;
  onPending: (value: boolean) => void;
}
export function useNotebookDocumentPicker({
  notebookId,
  sources,
  onAdded,
  disabled,
  onPending,
}: NotebookDocumentPickerProps) {
  const userId = useAppSelector((state) => state.auth.userId);
  const [scope, setScope] = useState("mine");
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 300);
  const searching = term !== search.trim();
  const [selection, setSelection] = useState<Map<string, DocumentItem>>(
    new Map(),
  );
  const [added, setAdded] = useState<Map<string, DocumentItem>>(new Map());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const folderId = folders.at(-1)?.id;
  const sourceIds = new Set(sources.map((source) => source.document_id));
  const extraSources = [...added.values()].filter(
    (document) => !sourceIds.has(document.id),
  );
  const effectiveSources = [
    ...sources,
    ...extraSources.map((document) => ({ size_bytes: document.sizeBytes })),
  ];
  const addedIds = new Set([...sourceIds, ...added.keys()]);
  const selected = [...selection.values()].filter(
    (document) => !addedIds.has(document.id),
  );
  const remaining = Math.max(
    0,
    NOTEBOOK_SOURCE_LIMIT - effectiveSources.length,
  );
  const locked = pending || disabled;
  const query = useQuery({
    queryKey: ["notebook-document-picker", userId, scope, folderId, page, term],
    queryFn: ({ signal }) =>
      scope === "shared" && !folderId
        ? documentsApi.getSharedDocuments(
            { page, limit: NOTEBOOK_DOCUMENT_PAGE_SIZE, search: term },
            signal,
          )
        : documentsApi.getDocuments(
            {
              folderId,
              page,
              limit: NOTEBOOK_DOCUMENT_PAGE_SIZE,
              search: term,
            },
            signal,
          ),
    enabled: Boolean(userId) && !searching,
    retry: false,
    gcTime: 0,
  });
  if (
    !searching &&
    query.data &&
    page > Math.max(1, query.data.meta.totalPages)
  )
    setPage(Math.max(1, query.data.meta.totalPages));
  const navigate = (path: typeof folders) => {
    setFolders(path);
    setPage(1);
    setSearch("");
  };
  const toggle = (document: DocumentItem) => {
    if (locked || addedIds.has(document.id)) return;
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(document.id)) next.delete(document.id);
      else {
        if (
          documentSourceReason(
            document,
            effectiveSources,
            [...next.values()].filter(
              (candidate) => !addedIds.has(candidate.id),
            ),
          )
        )
          return current;
        next.set(document.id, document);
      }

      return next;
    });
  };
  const add = async () => {
    if (
      submitting.current ||
      locked ||
      !selected.length ||
      !userId ||
      store.getState().auth.userId !== userId
    )
      return;
    submitting.current = true;
    setPending(true);
    onPending(true);
    setError("");
    try {
      validateDocumentSources(selected, effectiveSources);
      await notebooksApi.add(
        notebookId,
        selected.map((document) => document.id),
      );
      if (store.getState().auth.userId !== userId) return;
      setAdded(
        (current) =>
          new Map([
            ...current,
            ...selected.map((document) => [document.id, document] as const),
          ]),
      );
      setSelection(new Map());
      try {
        await onAdded();
      } catch {
        setError(
          "Sources were added, but the notebook could not refresh. Reload the notebook to view them.",
        );
      }
    } catch (cause) {
      setError(uploadError(cause));
    } finally {
      submitting.current = false;
      setPending(false);
      onPending(false);
    }
  };

  return {
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
    reasonFor: (document: DocumentItem) =>
      documentSourceReason(document, effectiveSources, selected),
  };
}
