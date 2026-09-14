"use client";

import { useState, useCallback } from "react";
import { ViewLayout, DocumentSortBy } from "../types/documents.types";
import { DocumentViewType } from "../types/documents.enums";

export interface PathItem {
  id: string | null;
  name: string;
}

export interface UseDocumentExplorerStateOptions {
  initialFolderId?: string | null;
  initialPath?: PathItem[];
  onNavigate?: (folderId: string | null, folderName?: string) => void;
}

export function useDocumentExplorerState({
  initialFolderId = null,
  initialPath = [{ id: null, name: "My Files" }],
  onNavigate,
}: UseDocumentExplorerStateOptions = {}) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<ViewLayout>(ViewLayout.GRID);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeDetailsItemId, setActiveDetailsItemId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<DocumentSortBy>(DocumentSortBy.LATEST);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigate = useCallback(
    (folderId: string | null, folderName?: string) => {
      setSelectedItemId(null);
      setActiveMenuId(null);
      setCurrentPage(1);
      if (onNavigate) {
        onNavigate(folderId, folderName);
      }
    },
    [onNavigate]
  );

  const handleSortChange = useCallback((newSortBy: DocumentSortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
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
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery: handleSearchChange,
    handleNavigate,
  };
}
