"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Folder,
  FileText,
  Download,
  FolderArchive,
  ChevronRight,
  Home,
  Loader2,
  ArrowLeft,
} from "lucide-react";
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
    <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs font-bold text-slate-500 overflow-x-auto min-w-0 flex-1">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && (
                <ChevronRight size={12} className="text-slate-300 shrink-0" />
              )}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={
                  index === breadcrumbs.length - 1
                    ? "text-slate-800 font-black truncate max-w-[180px]"
                    : "hover:text-blue-600 transition-colors truncate max-w-[120px] cursor-pointer"
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
          className="flex items-center gap-1.5 ml-4 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-98"
        >
          <FolderArchive size={13} />
          <span>Tải tất cả (ZIP)</span>
        </button>
      </div>

      {/* Back button for sub-folders */}
      {breadcrumbs.length > 1 && (
        <button
          onClick={() => handleBreadcrumbClick(breadcrumbs.length - 2)}
          className="flex items-center gap-2 w-full px-5 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Quay lại</span>
        </button>
      )}

      {/* File/Folder List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Folder size={40} className="text-slate-200 mb-3" />
          <span className="text-sm font-semibold">Thư mục trống</span>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {children.map((item) => {
            const isFolder = item.type === DocumentItemType.FOLDER;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors group"
              >
                {/* Icon + Name */}
                <button
                  onClick={() => isFolder && handleNavigateInto(item)}
                  className={`flex items-center gap-3 min-w-0 flex-1 text-left ${isFolder ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isFolder
                        ? "bg-amber-50 text-amber-500"
                        : "bg-blue-50 text-blue-500"
                    }`}
                  >
                    {isFolder ? <Folder size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate group-hover:text-slate-900">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <FolderArchive size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleDownloadFile(item)}
                      title="Tải xuống tệp"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  {isFolder && (
                    <button
                      onClick={() => handleNavigateInto(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
