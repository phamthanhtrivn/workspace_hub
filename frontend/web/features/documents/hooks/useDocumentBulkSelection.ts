"use client";

import { useEffect, useRef, useState } from "react";
import {
  isCancelledError,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
  type DocumentDropDestination,
} from "../types/document-bulk.types";
import {
  getBulkBlockers,
  getDocumentDropBlockReason,
} from "../utils/document-bulk";
import { METADATA_QUERY_KEY } from "@/features/chat/types/document.constants";
import { isProjectRootFolder } from "../utils/project-documents";

export function useDocumentBulkSelection(scope: DocumentListScope) {
  const client = useQueryClient();
  const mutationInFlight = useRef(false);
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
    action: null as DocumentBulkAction | null,
    items: [] as DocumentItem[],
    allSelected: false,
    loadToken: null as object | null,
    requestedAction: null as DocumentBulkAction | null,
    dropDestination: null as DocumentDropDestination | null,
    dropFromSelection: false,
  };
  const [selection, setSelection] = useState(empty);
  if (selection.scopeKey !== scopeKey) setSelection(empty);
  const state = selection.scopeKey === scopeKey ? selection : empty;
  useEffect(
    () => () => {
      void client.cancelQueries({
        queryKey: ["documents", "selection", scopeKey],
      });
    },
    [client, scopeKey],
  );
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
              dropDestination: null,
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
              dropDestination: null,
            }
          : previous,
      );
    },
    onSettled: async (_response, error, _request, context) => {
      try {
        await Promise.all([
          client.invalidateQueries({ queryKey: ["documents"] }),
          client.invalidateQueries({ queryKey: ["document-quota"] }),
          client.invalidateQueries({ queryKey: [METADATA_QUERY_KEY] }),
          client.invalidateQueries({ queryKey: ["folder-picker"] }),
        ]);
      } finally {
        mutationInFlight.current = false;
        if (!error)
          setSelection((previous) =>
            previous.scopeKey === context?.scopeKey
              ? { ...previous, active: false, action: null }
              : previous,
          );
      }
    },
  });
  const busy = mutation.isPending || !!state.loadToken;
  const selectedIds = new Set(state.items.map((item) => item.id));
  const selectAll = async () => {
    if (busy) return;
    const token = {};
    setSelection((previous) => ({ ...previous, loadToken: token }));
    try {
      const results = await client.fetchQuery({
        queryKey: ["documents", "selection", scopeKey, scope.sortBy],
        queryFn: ({ signal }) =>
          collectDocumentSelection(
            (page) => getDocumentListPage(scope, page, signal),
            signal,
          ),
        staleTime: 0,
        retry: false,
      });
      const items = results.filter((item) => !isProjectRootFolder(item));
      setSelection((previous) =>
        previous.scopeKey === scopeKey && previous.loadToken === token
          ? {
              ...previous,
              items,
              allSelected: items.length > 0,
              loadToken: null,
            }
          : previous,
      );
    } catch (error) {
      setSelection((previous) =>
        previous.scopeKey === scopeKey && previous.loadToken === token
          ? { ...previous, loadToken: null }
          : previous,
      );
      if (!isCancelledError(error))
        toast.error(getActionErrorMessage(error, M.LOAD_FAILED));
    }
  };

  const performAction = (
    action: DocumentBulkAction,
    parentFolderId?: string | null,
  ) => {
    if (
      action !== state.action ||
      mutationInFlight.current ||
      busy ||
      !state.items.length ||
      getBulkBlockers(state.items, action).length
    )
      return;
    mutationInFlight.current = true;
    mutation.mutate({
      ids: state.items.map((item) => item.id),
      action,
      parentFolderId,
      projectId: state.items[0]?.projectId ?? undefined,
    });
  };

  return {
    ...state,
    selectedIds,
    busy,
    selectAll,
    start: (action: DocumentBulkAction, initialItem?: DocumentItem) => {
      if (
        busy ||
        mutationInFlight.current ||
        (initialItem && getBulkBlockers([initialItem], action).length)
      )
        return;
      setSelection({
        ...empty,
        active: true,
        action,
        items: initialItem ? [initialItem] : [],
      });
    },
    getDisabledReason: (item: DocumentItem) =>
      state.action
        ? getBulkBlockers([item], state.action)[0]?.reason
        : undefined,
    requestDrop: (
      items: DocumentItem[],
      destination: DocumentDropDestination,
    ) => {
      const sources = state.active ? state.items : items;
      if (
        busy ||
        mutationInFlight.current ||
        (state.active && state.action !== DocumentBulkAction.MOVE) ||
        getDocumentDropBlockReason(sources, destination)
      )
        return;
      setSelection({
        ...empty,
        active: true,
        action: DocumentBulkAction.MOVE,
        items: sources,
        requestedAction: DocumentBulkAction.MOVE,
        dropDestination: destination,
        dropFromSelection: state.active,
      });
    },
    cancel: () => {
      if (!mutation.isPending) {
        void client.cancelQueries({
          queryKey: ["documents", "selection", scopeKey],
        });
        setSelection(empty);
      }
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
      if (
        !state.action ||
        (!selectedIds.has(item.id) &&
          getBulkBlockers([item], state.action).length)
      )
        return;
      setSelection((previous) => ({
        ...previous,
        allSelected: false,
        items: previous.items.some((selected) => selected.id === item.id)
          ? previous.items.filter((selected) => selected.id !== item.id)
          : [...previous.items, item],
      }));
    },
    requestAction: () => {
      const action = state.action;
      if (
        action &&
        !busy &&
        state.items.length &&
        !getBulkBlockers(state.items, action).length
      ) {
        if (
          action === DocumentBulkAction.MOVE ||
          action === DocumentBulkAction.TRASH ||
          action === DocumentBulkAction.DELETE
        )
          setSelection((previous) => ({
            ...previous,
            requestedAction: action,
          }));
        else performAction(action);
      }
    },
    closeAction: () => {
      if (!mutation.isPending)
        setSelection((previous) =>
          previous.dropDestination && !previous.dropFromSelection
            ? empty
            : { ...previous, requestedAction: null, dropDestination: null },
        );
    },
    execute: (parentFolderId?: string | null) => {
      const action = state.requestedAction;
      if (action)
        performAction(
          action,
          state.dropDestination ? state.dropDestination.id : parentFolderId,
        );
    },
  };
}

export type DocumentBulkSelection = ReturnType<typeof useDocumentBulkSelection>;
