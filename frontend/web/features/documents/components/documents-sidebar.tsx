"use client";

import React, { useState } from "react";
import DocumentExplorer from "./document-explorer";
import QuotaWidget from "./quota-widget";
import { Folder, Share2, Star, Trash2 } from "lucide-react";
import { DocumentViewType, NavigationLabel } from "../types/documents.enums";
import { cn } from "@/lib/utils";

function DocumentsView() {
  const [activeView, setActiveView] = useState<DocumentViewType>(
    DocumentViewType.MY_FILES,
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Breadcrumb path state
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: NavigationLabel.ROOT },
  ]);

  const handleNavigate = (
    folderId: string | null,
    folderName?: string,
    viewContext?: DocumentViewType,
  ) => {
    setCurrentFolderId(folderId);

    const activeV = viewContext !== undefined ? viewContext : activeView;

    if (folderId === null) {
      const rootLabel =
        activeV === DocumentViewType.STARRED
          ? NavigationLabel.STARRED
          : activeV === DocumentViewType.SHARED
            ? NavigationLabel.SHARED
            : NavigationLabel.ROOT;
      setPath([{ id: null, name: rootLabel }]);
    } else if (folderName) {
      // Navigate deeper
      const exists = path.some((p) => p.id === folderId);
      if (!exists) {
        setPath([...path, { id: folderId, name: folderName }]);
      }
    }
  };

  const handleViewChange = (view: DocumentViewType) => {
    setActiveView(view);
    // Reset to root directory when switching main tabs
    handleNavigate(null, undefined, view);
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-100px)] min-h-0">
      {/* Main Grid: Sidebar + Explorer */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Navigation Sidebar */}
        <div className="w-60 shrink-0 flex flex-col justify-between hidden md:flex">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleViewChange(DocumentViewType.MY_FILES)}
              className={cn(
                "flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all cursor-pointer group",
                activeView === DocumentViewType.MY_FILES
                  ? "bg-blue-50 text-[var(--color-primary)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Folder
                size={18}
                className={cn(
                  "transition-all duration-300",
                  activeView === DocumentViewType.MY_FILES
                    ? "text-blue-600 fill-blue-500/20 scale-110"
                    : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span>Tài liệu của tôi</span>
            </button>

            <button
              onClick={() => handleViewChange(DocumentViewType.SHARED)}
              className={cn(
                "flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all cursor-pointer group",
                activeView === DocumentViewType.SHARED
                  ? "bg-blue-50 text-[var(--color-primary)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Share2
                size={18}
                className={cn(
                  "transition-all duration-300",
                  activeView === DocumentViewType.SHARED
                    ? "text-blue-600 fill-blue-600/20 scale-110"
                    : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span>Được chia sẻ</span>
            </button>

            <button
              onClick={() => handleViewChange(DocumentViewType.STARRED)}
              className={cn(
                "flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all cursor-pointer group",
                activeView === DocumentViewType.STARRED
                  ? "bg-blue-50 text-[var(--color-primary)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Star
                size={18}
                className={cn(
                  "transition-all duration-300",
                  activeView === DocumentViewType.STARRED
                    ? "text-amber-500 fill-amber-400 scale-110"
                    : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span>Đã đánh dấu sao</span>
            </button>

            <button
              onClick={() => handleViewChange(DocumentViewType.TRASH)}
              className={cn(
                "flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all cursor-pointer group",
                activeView === DocumentViewType.TRASH
                  ? "bg-red-50 text-red-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Trash2
                size={18}
                className={cn(
                  "transition-all duration-300",
                  activeView === DocumentViewType.TRASH
                    ? "text-red-500 fill-red-500/20 scale-110"
                    : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span>Thùng rác</span>
            </button>
          </div>

          {/* Quota Space Status Indicator */}
          <QuotaWidget />
        </div>

        {/* Explorer Content */}
        <DocumentExplorer
          currentFolderId={currentFolderId}
          onNavigate={handleNavigate}
          activeView={activeView}
          path={path}
          setPath={setPath}
        />
      </div>
    </div>
  );
}

export default React.memo(DocumentsView);
