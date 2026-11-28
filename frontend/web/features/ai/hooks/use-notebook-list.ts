"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notebooksApi } from "../api/notebooks.api";
import { useDebouncedValue } from "@/features/chat/hooks/useDebouncedValue";
import {
  notebookKeys,
  NOTEBOOK_LIST_DEFAULTS,
  type NotebookListParams,
  type NotebookSort,
} from "../types/notebook-list";

const SEARCH_DELAY_MS = 300;

export function useNotebookList(userId: string) {
  const [filters, setFilters] = useState<NotebookListParams>(
    NOTEBOOK_LIST_DEFAULTS,
  );
  const search = useDebouncedValue(filters.search.trim(), SEARCH_DELAY_MS);
  const searching = search !== filters.search.trim();
  const params: NotebookListParams = { ...filters, search };
  const query = useQuery({
    queryKey: notebookKeys.list(userId, params),
    queryFn: ({ signal }) => notebooksApi.page(params, signal),
    enabled: !searching,
    retry: false,
    staleTime: 30_000,
    gcTime: 300_000,
  });
  if (!searching && query.data && filters.page !== query.data.meta.page)
    setFilters((current) => ({ ...current, page: query.data.meta.page }));

  return {
    query,
    filters,
    setSearch: (value: string) =>
      setFilters((current) => ({ ...current, page: 1, search: value })),
    setSort: (sort: NotebookSort) =>
      setFilters((current) => ({ ...current, page: 1, sort })),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    clear: () => setFilters(NOTEBOOK_LIST_DEFAULTS),
    hasFilters: Boolean(
      filters.search || filters.sort !== NOTEBOOK_LIST_DEFAULTS.sort,
    ),
    searching,
  };
}
