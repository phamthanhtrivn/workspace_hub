"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { documentsApi } from "../../api/documents.api";
import { DOCUMENT_NAVIGATION_ITEMS } from "../../types/document-navigation.constants";
import { DocumentViewType } from "../../types/documents.enums";
import { DocumentsSidebarStoragePanel } from "./documents-sidebar-storage-panel";
import { DocumentsFolderTree } from "./documents-folder-tree";

export interface DocumentsSidebarProps {
  activeView: DocumentViewType;
  currentFolderId?: string | null;
  onViewChange: (view: DocumentViewType) => void;
  onSelectFolder?: (folderId: string | null) => void;
  onUploadFiles?: (files: FileList) => void;
  onCreateFolder?: () => void;
}

export function DocumentsSidebar({
  activeView,
  currentFolderId = null,
  onViewChange,
  onSelectFolder,
  onUploadFiles,
  onCreateFolder,
}: DocumentsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("documents_sidebar_collapsed");
        if (saved === "true") setCollapsed(true);
      } catch {
        // ignore
      }
    });
  }, []);

  const toggleCollapsed = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem("documents_sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  const summaryQuery = useQuery({
    queryKey: ["documents", "navigation-summary"],
    queryFn: documentsApi.getNavigationSummary,
    staleTime: 30_000,
  });

  const summary = summaryQuery.data;
  const counts: Record<DocumentViewType, number | undefined> = {
    [DocumentViewType.MY_FILES]: summary?.myFilesCount,
    [DocumentViewType.RECENT]: summary?.recentCount,
    [DocumentViewType.STARRED]: summary?.starredCount,
    [DocumentViewType.SHARED]: summary?.sharedCount,
    [DocumentViewType.TRASH]: summary?.trashCount,
  };

  const canCreate = activeView === DocumentViewType.MY_FILES;

  return (
    <aside
      aria-label="Document navigation"
      className={cn(
        "flex min-h-0 min-w-0 shrink-0 flex-col border-b border-border bg-sidebar transition-[width] duration-200 @min-[960px]/documents:border-b-0 @min-[960px]/documents:border-r",
        collapsed
          ? "px-4 py-3 @min-[960px]/documents:w-12 @min-[960px]/documents:items-center @min-[960px]/documents:px-2 @min-[960px]/documents:py-3"
          : "gap-3 px-4 py-4 @min-[960px]/documents:w-[272px] @min-[960px]/documents:gap-0 @min-[960px]/documents:p-0",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length && onUploadFiles) {
            onUploadFiles(event.target.files);
            event.target.value = "";
          }
        }}
      />

      {collapsed ? (
        <div className="hidden h-full w-full flex-col items-center justify-between @min-[960px]/documents:flex">
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => toggleCollapsed(false)}
              title="Expand Documents sidebar"
              aria-label="Expand Documents sidebar"
              className="size-8 rounded-control text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              size="icon-sm"
              disabled={!canCreate || !onUploadFiles}
              onClick={() => fileInputRef.current?.click()}
              title="Upload / New"
              aria-label="Upload files"
              className="size-8 rounded-control"
            >
              <Upload className="size-3.5" aria-hidden="true" />
            </Button>

            <div className="my-0.5 h-px w-6 bg-border" />

            {DOCUMENT_NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onViewChange(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "size-8 rounded-control",
                    active
                      ? "bg-info-soft text-info-content"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </Button>
              );
            })}
          </div>

          <DocumentsSidebarStoragePanel
            collapsed
            onExpand={() => toggleCollapsed(false)}
          />
        </div>
      ) : null}

      {/* Mobile horizontal nav + Desktop expanded sidebar */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          collapsed && "@min-[960px]/documents:hidden",
        )}
      >
        <div className="hidden items-center justify-between border-b border-border px-4 py-3.5 @min-[960px]/documents:flex">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-info-soft text-info-content">
              <FileText className="size-3.5" aria-hidden="true" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">Documents</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleCollapsed(true)}
            title="Collapse sidebar"
            aria-label="Collapse Documents sidebar"
            className="size-7 rounded-control text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {(onUploadFiles || onCreateFolder) && (
          <div className="hidden items-center gap-2 px-3.5 pt-3.5 pb-2 @min-[960px]/documents:flex">
            <Button
              type="button"
              size="sm"
              disabled={!canCreate || !onUploadFiles}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 flex-1 gap-1.5 rounded-control text-xs font-semibold"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Upload / New
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!canCreate || !onCreateFolder}
              onClick={onCreateFolder}
              title="New Folder"
              aria-label="New Folder"
              className="size-8 shrink-0 rounded-control bg-card"
            >
              <FolderPlus className="size-4 text-link" aria-hidden="true" />
            </Button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-0 py-0 @min-[960px]/documents:px-3 @min-[960px]/documents:py-2">
          <nav
            className="flex gap-1.5 overflow-x-auto @min-[960px]/documents:flex-col @min-[960px]/documents:gap-0.5 @min-[960px]/documents:overflow-visible"
            aria-label="Document Navigation"
          >
            {DOCUMENT_NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              const count = counts[item.id];

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onViewChange(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "h-8 shrink-0 justify-between gap-2 rounded-control px-2.5 text-xs font-medium",
                    active
                      ? "bg-info-soft font-semibold text-info-content hover:bg-info-soft"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        active ? "text-info-content" : item.iconClassName,
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </span>
                  {count !== undefined && (
                    <span
                      className={cn(
                        "hidden rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums @min-[960px]/documents:inline-block",
                        active
                          ? "bg-card text-info-content"
                          : "text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>

          {onSelectFolder && (
            <div className="hidden @min-[960px]/documents:block">
              <DocumentsFolderTree
                currentFolderId={currentFolderId}
                onSelectFolder={onSelectFolder}
              />
            </div>
          )}
        </div>

        <div className="hidden border-t border-border p-3 @min-[960px]/documents:block">
          <DocumentsSidebarStoragePanel />
        </div>
      </div>
    </aside>
  );
}

export default React.memo(DocumentsSidebar);
