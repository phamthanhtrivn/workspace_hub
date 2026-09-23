"use client";

import { useState, useCallback, useEffect } from "react";
import { ViewLayout, DocumentSortBy } from "../types/documents.types";
import { DocumentViewType } from "../types/documents.enums";

export interface PathItem {
  id: string | null;
  name: string;
}

export interface UseDocumentExplorerStateOptions {
  initialFolderId?: string | null;
  initialPath?: PathItem[];
  activeView?: DocumentViewType;
  onNavigate?: (folderId: string | null, folderName?: string) => void;
}

export function useDocumentExplorerState({
  initialFolderId = null,
  initialPath = [{ id: null, name: "My Files" }],
  activeView,
  onNavigate,
}: UseDocumentExplorerStateOptions = {}) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<ViewLayout>(ViewLayout.GRID);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeDetailsItemId, setActiveDetailsItemId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<DocumentSortBy>(DocumentSortBy.LATEST);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSelectedItemId(null);
    setActiveMenuId(null);
  }, [activeView, initialFolderId]);

  const handleNavigate = useCallback(
    (folderId: string | null, folderName?: string) => {
      setSelectedItemId(null);
      setActiveMenuId(null);
      if (onNavigate) {
        onNavigate(folderId, folderName);
      }
    },
    [onNavigate]
  );

  const handleSortChange = useCallback((newSortBy: DocumentSortBy) => {
    setSortBy(newSortBy);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    activeMenuId,
    setActiveMenuId,
    viewLayout,
    setViewLayout,
    selectedItemId,
    setSelectedItemId,
    activeDetailsItemId,
    setActiveDetailsItemId,
    sortBy,
    setSortBy: handleSortChange,
    searchQuery,
    setSearchQuery: handleSearchChange,
    handleNavigate,
  };
}
