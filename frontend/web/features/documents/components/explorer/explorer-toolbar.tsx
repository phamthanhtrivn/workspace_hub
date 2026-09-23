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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
      {/* Search Input */}
      <DocumentsSearchInput
        value={searchQuery}
        onChange={onSearchQueryChange}
        placeholder="Search documents, folders (Ctrl+K)..."
        className="max-w-md"
      />

      <div className="flex items-center gap-3">
        {/* Sort Select */}
        <DocumentsSelect
          value={sortBy}
          options={sortOptions}
          onChange={onSortByChange}
        />

        {/* View Switcher */}
        <div className="flex items-center rounded-md border border-slate-200/80 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onViewLayoutChange(ViewLayout.GRID)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md text-xs font-bold transition cursor-pointer",
              viewLayout === ViewLayout.GRID
                ? "bg-white text-[#0052CC] shadow-xs border border-slate-200/80"
                : "text-slate-400 hover:text-slate-700"
            )}
            title="Grid View"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewLayoutChange(ViewLayout.LIST)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md text-xs font-bold transition cursor-pointer",
              viewLayout === ViewLayout.LIST
                ? "bg-white text-[#0052CC] shadow-xs border border-slate-200/80"
                : "text-slate-400 hover:text-slate-700"
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
              className="h-10 gap-2 rounded-md bg-[#0052CC] hover:bg-[#0043A8] text-white px-4 text-sm font-bold shadow-[0_8px_20px_rgba(0,82,204,0.22)] transition cursor-pointer"
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
                <div className="absolute right-0 mt-2 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onCreateFolder();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <FolderPlus className="h-4 w-4 text-amber-500" />
                    <span>New folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer border-t border-slate-100 mt-1 pt-2"
                  >
                    <UploadCloud className="h-4 w-4 text-blue-500" />
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
