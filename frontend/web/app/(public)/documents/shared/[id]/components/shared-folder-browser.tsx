"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Folder,
  Download,
  FolderArchive,
  ChevronRight,
  Home,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";
import { DocumentItem } from "@/features/documents/types/documents.types";
import {
  DocumentItemType,
  DocumentRole,
} from "@/features/documents/types/documents.enums";
import { documentsApi } from "@/features/documents/api/documents.api";
import {
  formatBytes,
  formatDateShort,
} from "@/features/documents/utils/documents.utils";
import { toast } from "sonner";
import {
  DownloadQueueProvider,
  useDownloadQueue,
} from "@/features/documents/components/download/download-queue-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  id: string;
  name: string;
}

interface SharedFolderBrowserProps {
  rootItem: DocumentItem;
  rootId: string;
  userRole: DocumentRole;
}

// ─── Inner browser (needs DownloadQueueProvider context) ───────────────────────

function SharedFolderBrowserInner({
  rootItem,
  rootId,
  userRole,
}: SharedFolderBrowserProps) {
  const [children, setChildren] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string>(rootId);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([
    { id: rootId, name: rootItem.name },
  ]);

  const { enqueueDownload } = useDownloadQueue();

  const loadChildren = useCallback(
    async (folderId: string) => {
      setIsLoading(true);
      try {
        const items = await documentsApi.getPublicFolderChildren(
          rootId,
          folderId,
        );
        setChildren(items);
      } catch (err) {
        console.error("Failed to load folder children", err);
        toast.error("Không thể tải nội dung thư mục");
      } finally {
        setIsLoading(false);
      }
    },
    [rootId],
  );

  useEffect(() => {
    void loadChildren(currentFolderId);
  }, [currentFolderId, loadChildren]);

  const handleNavigateInto = (folder: DocumentItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const handleDownloadFile = async (item: DocumentItem) => {
    try {
      const url = await documentsApi.getPublicDownloadUrl(item.id);
      const a = document.createElement("a");
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download file", err);
      toast.error("Không thể tải xuống tệp tin");
    }
  };

  const isViewer =
    userRole === DocumentRole.VIEWER || userRole === DocumentRole.NONE;

  return (
    <div className="bg-card rounded-dialog border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground overflow-x-auto min-w-0 flex-1">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && (
                <ChevronRight size={12} className="text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={
                  index === breadcrumbs.length - 1
                    ? "text-foreground font-semibold truncate max-w-[180px]"
                    : "hover:text-info transition-colors truncate max-w-[120px] cursor-pointer"
                }
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home size={11} />
                    {crumb.name}
                  </span>
                ) : (
                  crumb.name
                )}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Download Entire Folder */}
        <button
          onClick={() => enqueueDownload(rootId, rootItem.name, true)}
          className="flex items-center gap-1.5 ml-4 shrink-0 rounded-control bg-primary hover:bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold cursor-pointer transition-all"
        >
          <FolderArchive size={13} />
          <span>Tải tất cả (ZIP)</span>
        </button>
      </div>

      {/* Back button for sub-folders */}
      {breadcrumbs.length > 1 && (
        <button
          onClick={() => handleBreadcrumbClick(breadcrumbs.length - 2)}
          className="flex items-center gap-2 w-full px-5 py-3 text-xs font-semibold text-muted-foreground hover:bg-background transition-colors border-b border-border cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Quay lại</span>
        </button>
      )}

      {/* File/Folder List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-info" />
        </div>
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Folder size={40} className="text-muted-foreground mb-3" />
          <span className="text-sm font-semibold">Thư mục trống</span>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {children.map((item) => {
            const isFolder = item.type === DocumentItemType.FOLDER;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-background transition-colors group"
              >
                {/* Icon + Name */}
                <button
                  onClick={() => isFolder && handleNavigateInto(item)}
                  className={`flex items-center gap-3 min-w-0 flex-1 text-left ${isFolder ? "cursor-pointer" : "cursor-default"}`}
                >
                  <DocumentIcon
                    item={item}
                    iconSize={16}
                    className="p-2 rounded-panel"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {isFolder ? "Thư mục" : formatBytes(item.sizeBytes)}
                      {" · "}
                      {formatDateShort(item.updatedAt)}
                    </p>
                  </div>
                </button>

                {/* Action buttons */}
                <div className="flex items-center gap-1 ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isFolder ? (
                    <button
                      onClick={() => enqueueDownload(item.id, item.name, true)}
                      title="Tải xuống thư mục (ZIP)"
                      className="p-1.5 rounded-control text-muted-foreground hover:text-info hover:bg-info-soft transition-colors cursor-pointer"
                    >
                      <FolderArchive size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleDownloadFile(item)}
                      title="Tải xuống tệp"
                      className="p-1.5 rounded-control text-muted-foreground hover:text-info hover:bg-info-soft transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  {isFolder && (
                    <button aria-label="Open folder"
                      onClick={() => handleNavigateInto(item)}
                      className="p-1.5 rounded-control text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Exported component (provides DownloadQueueProvider) ──────────────────────

export function SharedFolderBrowser(props: SharedFolderBrowserProps) {
  return (
    <DownloadQueueProvider>
      <SharedFolderBrowserInner {...props} />
    </DownloadQueueProvider>
  );
}
