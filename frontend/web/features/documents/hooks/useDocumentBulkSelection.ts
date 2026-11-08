"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { documentsApi } from "../api/documents.api";
import {
  collectDocumentSelection,
  getDocumentListPage,
  type DocumentListScope,
} from "../api/document-list.api";
import type { DocumentItem } from "../types/documents.types";
import {
  DocumentBulkAction,
  type DocumentBulkRequest,
  DOCUMENT_BULK_MESSAGES as M,
} from "../types/document-bulk.types";
import { getBulkBlockers } from "../utils/document-bulk";
import { METADATA_QUERY_KEY } from "@/features/chat/types/document.constants";

export function useDocumentBulkSelection(scope: DocumentListScope) {
  const client = useQueryClient();
  const userId = useAppSelector((state) => state.auth.userId);
  const scopeKey = JSON.stringify([
    userId,
    scope.activeView,
    scope.currentFolderId,
    scope.projectId,
    scope.searchQuery,
  ]);
  const empty = {
    scopeKey,
    active: false,
    items: [] as DocumentItem[],
    allSelected: false,
    loadToken: null as object | null,
    requestedAction: null as DocumentBulkAction | null,
  };
  const [selection, setSelection] = useState(empty);
  if (selection.scopeKey !== scopeKey) setSelection(empty);
  const state = selection.scopeKey === scopeKey ? selection : empty;
  const mutation = useMutation({
    mutationFn: (request: DocumentBulkRequest) =>
      documentsApi.bulkAction(request),
    onMutate: () => ({ scopeKey }),
    onSuccess: (_response, _request, context) => {
      toast.success(M.COMPLETE);
      setSelection((previous) =>
        previous.scopeKey === context.scopeKey
          ? {
              ...previous,
              items: [],
              allSelected: false,
              requestedAction: null,
            }
          : previous,
      );
    },
    onError: (error, _request, context) => {
      toast.error(getActionErrorMessage(error, M.FAILED));
      setSelection((previous) =>
        previous.scopeKey === context?.scopeKey
          ? {
              ...previous,
              items: [],
              allSelected: false,
              requestedAction: null,
            }
          : previous,
      );
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["documents"] }),
        client.invalidateQueries({ queryKey: ["document-quota"] }),
        client.invalidateQueries({ queryKey: [METADATA_QUERY_KEY] }),
        client.invalidateQueries({ queryKey: ["folder-picker"] }),
      ]);
    },
  });
  const busy = mutation.isPending || !!state.loadToken;
  const selectedIds = new Set(state.items.map((item) => item.id));
  const selectAll = async () => {
    if (busy) return;
    const token = {};
    setSelection((previous) => ({ ...previous, loadToken: token }));
    try {
      const items = await client.fetchQuery({
        queryKey: ["documents", "selection", scopeKey, scope.sortBy],
        queryFn: () =>
          collectDocumentSelection((page) => getDocumentListPage(scope, page)),
        staleTime: 0,
        retry: false,
      });
      setSelection((previous) =>
        previous.scopeKey === scopeKey && previous.loadToken === token
          ? { ...previous, items, allSelected: true, loadToken: null }
          : previous,
      );
    } catch (error) {
      setSelection((previous) =>
        previous.scopeKey === scopeKey && previous.loadToken === token
          ? { ...previous, loadToken: null }
          : previous,
      );
      toast.error(getActionErrorMessage(error, M.LOAD_FAILED));
    }
  };

  return {
    ...state,
    selectedIds,
    busy,
    selectAll,
    start: () => setSelection({ ...empty, active: true }),
    cancel: () => {
      if (!mutation.isPending) setSelection(empty);
    },
    clear: () => {
      if (!busy)
        setSelection((previous) => ({
          ...previous,
          items: [],
          allSelected: false,
        }));
    },
    toggle: (item: DocumentItem) => {
      if (busy) return;
      setSelection((previous) => ({
        ...previous,
        allSelected: false,
        items: previous.items.some((selected) => selected.id === item.id)
          ? previous.items.filter((selected) => selected.id !== item.id)
          : [...previous.items, item],
      }));
    },
    requestAction: (action: DocumentBulkAction) => {
      if (
        !busy &&
        state.items.length &&
        !getBulkBlockers(state.items, action).length
      )
        setSelection((previous) => ({ ...previous, requestedAction: action }));
    },
    closeAction: () => {
      if (!mutation.isPending)
        setSelection((previous) => ({ ...previous, requestedAction: null }));
    },
    execute: (parentFolderId?: string | null) => {
      const action = state.requestedAction;
      if (
        !action ||
        busy ||
        !state.items.length ||
        getBulkBlockers(state.items, action).length
      )
        return;
      mutation.mutate({
        ids: state.items.map((item) => item.id),
        action,
        parentFolderId,
        projectId: state.items[0]?.projectId ?? undefined,
      });
    },
  };
}

export type DocumentBulkSelection = ReturnType<typeof useDocumentBulkSelection>;
