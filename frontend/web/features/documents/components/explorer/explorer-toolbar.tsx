"use client";
import { useId as useControlledPopupId } from "react";

import React, { useState, useRef, useEffect } from "react";
import { Grid, List, ChevronDown, FolderPlus, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERMISSION_REASON } from "@/lib/permission-feedback";
import { DocumentViewType } from "../../types/documents.enums";
import { ViewLayout, DocumentSortBy } from "../../types/documents.types";
import {
  DocumentsSearchInput,
  DocumentsSelect,
} from "../ui/documents-form-controls";
import { Button } from "@/components/ui/button";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface ExplorerToolbarProps {
  actions?: React.ReactNode;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  viewLayout: ViewLayout;
  onViewLayoutChange: (layout: ViewLayout) => void;
  activeView: DocumentViewType;
  onCreateFolder: () => void;
  onUploadFile?: (files: FileList | File[] | File) => void;
  canEditDocuments?: boolean;
  editDisabledReason?: string;
  sortBy: DocumentSortBy;
  onSortByChange: (sortBy: DocumentSortBy) => void;
}

export function ExplorerToolbar({
  actions,
  searchQuery,
  onSearchQueryChange,
  viewLayout,
  onViewLayoutChange,
  activeView,
  onCreateFolder,
  onUploadFile,
  canEditDocuments = true,
  editDisabledReason = PERMISSION_REASON.documentEdit,
  sortBy,
  onSortByChange,
}: ExplorerToolbarProps) {
  const controlledPopupId = useControlledPopupId();
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input,textarea,select,[role=combobox]"))
      )
        return;
      if (
        document.querySelector(
          '[aria-modal="true"]:not([aria-hidden="true"])',
        ) ||
        !searchInputRef.current?.getClientRects().length
      )
        return;
      event.preventDefault();
      searchInputRef.current.focus();
    };
    document.addEventListener("keydown", focusSearch);

    return () => document.removeEventListener("keydown", focusSearch);
  }, []);
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
        inputRef={searchInputRef}
        value={searchQuery}
        onChange={onSearchQueryChange}
        placeholder="Search documents and folders..."
        className="w-full min-w-0 max-w-none flex-none @min-[800px]/explorer:max-w-md @min-[800px]/explorer:flex-1"
      />

      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
        {/* Sort Select */}
        <DocumentsSelect
          ariaLabel="Sort documents"
          value={sortBy}
          options={sortOptions}
          onChange={onSortByChange}
        />

        {/* View Switcher */}
        <div className="flex items-center rounded-md border border-border bg-muted p-1">
          <Button
            variant="unstyled"
            type="button"
            onClick={() => onViewLayoutChange(ViewLayout.GRID)}
            className={cn(
              "relative focus-visible:z-10 grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition cursor-pointer",
              viewLayout === ViewLayout.GRID
                ? "bg-card text-info-content border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Grid View"
            aria-label="Grid view"
            aria-pressed={viewLayout === ViewLayout.GRID}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="unstyled"
            type="button"
            onClick={() => onViewLayoutChange(ViewLayout.LIST)}
            className={cn(
              "relative focus-visible:z-10 grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition cursor-pointer",
              viewLayout === ViewLayout.LIST
                ? "bg-card text-info-content border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="List View"
            aria-label="List view"
            aria-pressed={viewLayout === ViewLayout.LIST}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Create/Upload Dropdown */}
        {actions}
        {activeView === DocumentViewType.MY_FILES ? (
          <div className="relative">
            <Button
              aria-expanded={isNewMenuOpen}
              aria-controls={`${controlledPopupId}-isNewMenuOpen`}
              aria-haspopup="menu"
              disabledReason={
                !canEditDocuments ? editDisabledReason : undefined
              }
              type="button"
              onClick={() => setIsNewMenuOpen((prev) => !prev)}
              className="relative focus-visible:z-10 h-10 gap-2 rounded-control bg-primary hover:bg-primary-hover text-primary-foreground px-4 text-sm font-semibold transition cursor-pointer"
            >
              <span>+ New</span>
              <ChevronDown className="h-4 w-4" />
            </Button>

            {isNewMenuOpen ? (
              <>
                <AnchoredMenu
                  id={`${controlledPopupId}-isNewMenuOpen`}
                  onClose={() => setIsNewMenuOpen(false)}
                  side="bottom"
                  align="end"
                  aria-label="Create document"
                  className="z-40 w-48 rounded-panel border border-border bg-card p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 shadow-panel"
                >
                  <DropdownMenuItem
                    closeOnClick={false}

                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onCreateFolder();
                    }}
                    className="relative focus-visible:z-10 flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <FolderPlus className="h-4 w-4 text-warning-content" />
                    <span>New folder</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    closeOnClick={false}

                    onClick={() => {
                      setIsNewMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="relative focus-visible:z-10 flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer border-t border-border mt-1 pt-2"
                  >
                    <UploadCloud className="h-4 w-4 text-info-content" />
                    <span>Upload file</span>
                  </DropdownMenuItem>
                </AnchoredMenu>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        disabled={!canEditDocuments}
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
