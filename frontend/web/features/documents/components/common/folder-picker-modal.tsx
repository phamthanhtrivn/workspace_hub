"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { Folder, ChevronRight, Loader2 } from "lucide-react";
import { DocumentItemType, NavigationLabel } from "../../types/documents.enums";
import { DocumentItem } from "../../types/documents.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FolderPickerModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: string | null) => void;
  movingItemId: string;
  initialFolderId?: string | null;
}

export function FolderPickerModal({
  open,
  isOpen,
  onClose,
  onSelectFolder,
  movingItemId,
  initialFolderId = null,
}: FolderPickerModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: NavigationLabel.ROOT },
  ]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["folder-picker", currentFolderId],
    queryFn: () =>
      documentsApi.getDocuments({
        folderId: currentFolderId || undefined,
        limit: 1000,
      }),
    enabled: isModalOpen,
  });

  const items = response?.data || [];
  const folders = items.filter(
    (item: DocumentItem) =>
      item.type === DocumentItemType.FOLDER && item.id !== movingItemId
  );

  const handleNavigate = useCallback((folderId: string | null, name: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setPath([{ id: null, name: NavigationLabel.ROOT }]);
    } else {
      setPath((prev) => {
        const index = prev.findIndex((p) => p.id === folderId);
        if (index !== -1) {
          return prev.slice(0, index + 1);
        }
        return [...prev, { id: folderId, name }];
      });
    }
  }, []);

  const handlePathClick = useCallback((index: number) => {
    setPath((prev) => {
      const target = prev[index];
      setCurrentFolderId(target.id);
      return prev.slice(0, index + 1);
    });
  }, []);

  if (!isModalOpen) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-black text-slate-800">
              Move item
            </DialogTitle>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Select destination folder
            </p>
          </div>
        </DialogHeader>

        {/* Path Breadcrumbs */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold">
          {path.map((p, idx) => (
            <React.Fragment key={p.id ?? "root"}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
              <button
                type="button"
                onClick={() => handlePathClick(idx)}
                className={cn(
                  "transition hover:text-[#0052CC] cursor-pointer",
                  idx === path.length - 1 ? "text-slate-800 font-bold" : "text-slate-400"
                )}
              >
                {p.name === NavigationLabel.ROOT ? "My files" : p.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Sub-folders list */}
        <div className="mt-3 flex max-h-56 min-h-36 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#0052CC]" />
              <span className="mt-2 text-xs font-semibold">
                Loading folders...
              </span>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-slate-400">
              <Folder className="h-8 w-8 stroke-[1.5] text-slate-300" />
              <span className="mt-2 text-xs font-semibold">
                No subfolders found
              </span>
            </div>
          ) : (
            folders.map((folder: DocumentItem) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleNavigate(folder.id, folder.name)}
                className="flex items-center gap-3 rounded-lg p-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))
          )}
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSelectFolder(currentFolderId);
              onClose();
            }}
            className="h-9 rounded-md bg-[#0052CC] hover:bg-[#0043A8] px-5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(0,82,204,0.22)]"
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FolderPickerModal;
