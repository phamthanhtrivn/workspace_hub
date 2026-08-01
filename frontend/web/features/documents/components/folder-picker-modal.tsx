"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { Folder, ChevronRight, X, Loader2 } from "lucide-react";
import { DocumentItemType, NavigationLabel } from "../types/documents.enums";
import { DocumentItem } from "../types/documents.types";
import { cn } from "@/lib/utils";

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
  currentItemId: string;
  initialFolderId?: string | null;
  initialPath?: { id: string | null; name: string }[];
}

function FolderPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentItemId,
  initialFolderId = null,
  initialPath,
}: FolderPickerModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>(
    initialPath || [{ id: null, name: NavigationLabel.ROOT }],
  );

  const { data: response, isLoading } = useQuery({
    queryKey: ["folder-picker", currentFolderId],
    queryFn: () =>
      documentsApi.getDocuments({
        folderId: currentFolderId || undefined,
        limit: 1000,
      }),
    enabled: isOpen,
  });

  const items = response?.data || [];

  // Filter only folders, and exclude the current folder to prevent circular loops
  const folders =
    items.filter(
      (item: DocumentItem) =>
        item.type === DocumentItemType.FOLDER && item.id !== currentItemId,
    ) || [];

  if (!isOpen) return null;

  const handleNavigate = (folderId: string | null, name: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setPath([{ id: null, name: NavigationLabel.ROOT }]);
    } else {
      const index = path.findIndex((p) => p.id === folderId);
      if (index !== -1) {
        setPath(path.slice(0, index + 1));
      } else {
        setPath([...path, { id: folderId, name }]);
      }
    }
  };

  const handlePathClick = (index: number) => {
    const p = path[index];
    handleNavigate(p.id, p.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-800">
            Di chuyển tài nguyên
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Path Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50/50 px-5 py-3 text-sm border-b border-slate-100">
          {path.map((p, idx) => (
            <React.Fragment key={p.id ?? "root"}>
              {idx > 0 && <ChevronRight size={14} className="text-slate-300" />}
              <button
                onClick={() => handlePathClick(idx)}
                className={cn(
                  "font-medium hover:text-[var(--color-primary)] transition-colors cursor-pointer",
                  idx === path.length - 1 ? "text-slate-800" : "text-slate-400",
                )}
              >
                {p.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Body folder list */}
        <div className="max-h-60 min-h-40 overflow-y-auto p-4 flex flex-col gap-1">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-slate-400">
              <Loader2
                className="animate-spin text-[var(--color-primary)] mb-2"
                size={24}
              />
              <span>Đang tải danh mục...</span>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-slate-400">
              <Folder size={32} className="text-slate-200 mb-2" />
              <span className="text-sm font-medium">
                Không có thư mục con nào ở đây
              </span>
            </div>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleNavigate(folder.id, folder.name)}
                className="flex items-center gap-3 w-full rounded-xl p-3 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
              >
                <Folder
                  className="text-amber-400 group-hover:scale-105 transition-transform"
                  size={20}
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  {folder.name}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 justify-end border-t border-slate-100 p-5 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => onSelect(currentFolderId)}
            className="cursor-pointer rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] px-5 py-2 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg transition-all"
          >
            Di chuyển đến đây
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(FolderPickerModal);
