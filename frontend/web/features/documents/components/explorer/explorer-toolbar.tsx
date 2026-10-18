"use client";

import React, { useState, useRef } from "react";
import { Grid, List, ChevronDown, FolderPlus, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentViewType } from "../../types/documents.enums";
import { ViewLayout, DocumentSortBy } from "../../types/documents.types";
import {
  DocumentsSearchInput,
  DocumentsSelect,
} from "../ui/documents-form-controls";
import { Button } from "@/components/ui/button";

interface ExplorerToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  viewLayout: ViewLayout;
  onViewLayoutChange: (layout: ViewLayout) => void;
  activeView: DocumentViewType;
  onCreateFolder: () => void;
  onUploadFile?: (files: FileList | File[] | File) => void;
  canEditDocuments?: boolean;
  sortBy: DocumentSortBy;
  onSortByChange: (sortBy: DocumentSortBy) => void;
}

export function ExplorerToolbar({
  searchQuery,
  onSearchQueryChange,
  viewLayout,
  onViewLayoutChange,
  activeView,
  onCreateFolder,
  onUploadFile,
  canEditDocuments = true,
  sortBy,
  onSortByChange,
}: ExplorerToolbarProps) {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortOptions = [
    {
      value: DocumentSortBy.LATEST,
      label: "Latest",
    },
    {
      value: DocumentSortBy.OLDEST,
      label: "Oldest",
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-input pb-5">
      {/* Search Input */}
      <DocumentsSearchInput
        value={searchQuery}
        onChange={onSearchQueryChange}
        placeholder="Search documents, folders (Ctrl+K)..."
        className="w-full min-w-0 max-w-none flex-none @min-[800px]/explorer:max-w-md @min-[800px]/explorer:flex-1"
      />

      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
        {/* Sort Select */}
        <DocumentsSelect
          value={sortBy}
          options={sortOptions}
          onChange={onSortByChange}
        />

        {/* View Switcher */}
        <div className="flex items-center rounded-md border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => onViewLayoutChange(ViewLayout.GRID)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition cursor-pointer",
              viewLayout === ViewLayout.GRID
                ? "bg-card text-info-content border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Grid View"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewLayoutChange(ViewLayout.LIST)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition cursor-pointer",
              viewLayout === ViewLayout.LIST
                ? "bg-card text-info-content border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Create/Upload Dropdown */}
        {activeView === DocumentViewType.MY_FILES && canEditDocuments ? (
          <div className="relative">
            <Button
              type="button"
              onClick={() => setIsNewMenuOpen((prev) => !prev)}
              className="h-10 gap-2 rounded-control bg-primary hover:bg-primary-hover text-primary-foreground px-4 text-sm font-semibold transition cursor-pointer"
            >
              <span>+ New</span>
              <ChevronDown className="h-4 w-4" />
            </Button>

            {isNewMenuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsNewMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-40 w-48 rounded-panel border border-border bg-card p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 shadow-panel">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onCreateFolder();
                    }}
                    className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <FolderPlus className="h-4 w-4 text-warning-content" />
                    <span>New folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer border-t border-border mt-1 pt-2"
                  >
                    <UploadCloud className="h-4 w-4 text-info-content" />
                    <span>Upload file</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFile?.(e.target.files);
            e.target.value = "";
          }
        }}
        className="hidden"
      />
    </div>
  );
}

export default React.memo(ExplorerToolbar);
