"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useCallback, useEffect } from "react";
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
  projectId?: string;
  projectRootFolderId?: string | null;
  rootLabel?: string;
}

export function FolderPickerModal({
  open,
  isOpen,
  onClose,
  onSelectFolder,
  movingItemId,
  initialFolderId = null,
  projectId,
  projectRootFolderId = null,
  rootLabel,
}: FolderPickerModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const pickerRootFolderId = projectId ? projectRootFolderId : null;
  const pickerRootName = rootLabel || NavigationLabel.ROOT;
  const getInitialPickerFolderId = useCallback(
    () => initialFolderId ?? pickerRootFolderId,
    [initialFolderId, pickerRootFolderId],
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    getInitialPickerFolderId,
  );
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: pickerRootFolderId, name: pickerRootName },
  ]);

  useEffect(() => {
    if (!isModalOpen) return;
    setCurrentFolderId(getInitialPickerFolderId());
    setPath([{ id: pickerRootFolderId, name: pickerRootName }]);
  }, [
    getInitialPickerFolderId,
    isModalOpen,
    pickerRootFolderId,
    pickerRootName,
  ]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["folder-picker", currentFolderId, projectId, pickerRootFolderId],
    queryFn: () =>
      documentsApi.getDocuments({
        folderId: currentFolderId || undefined,
        projectId: projectId && !currentFolderId ? projectId : undefined,
        limit: 1000,
      }),
    enabled: isModalOpen && (!projectId || Boolean(pickerRootFolderId)),
  });

  const items = response?.data || [];
  const folders = items.filter(
    (item: DocumentItem) =>
      item.type === DocumentItemType.FOLDER && item.id !== movingItemId
  );

  const handleNavigate = useCallback((folderId: string | null, name: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setPath([{ id: pickerRootFolderId, name: pickerRootName }]);
    } else {
      setPath((prev) => {
        const index = prev.findIndex((p) => p.id === folderId);
        if (index !== -1) {
          return prev.slice(0, index + 1);
        }
        return [...prev, { id: folderId, name }];
      });
    }
  }, [pickerRootFolderId, pickerRootName]);

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
      <DialogContent className={`${dialogLayout.surface} max-w-md border-border bg-card p-6 text-foreground rounded-dialog`}>
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-warning-soft text-warning-content ring-1 ring-warning-outline">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Move item
            </DialogTitle>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              Select destination folder
            </p>
          </div>
        </DialogHeader>

        {/* Path Breadcrumbs */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-panel border border-border bg-background px-4 py-2.5 text-xs font-semibold">
          {path.map((p, idx) => (
            <React.Fragment key={p.id ?? "root"}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <Button variant="unstyled"
                type="button"
                onClick={() => handlePathClick(idx)}
                className={cn(
                  "transition hover:text-info-content cursor-pointer",
                  idx === path.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {p.name === NavigationLabel.ROOT ? "My files" : p.name}
              </Button>
            </React.Fragment>
          ))}
        </div>

        {/* Sub-folders list */}
        <div className={`${dialogLayout.body} mt-3 flex max-h-56 min-h-36 flex-col gap-1 overflow-y-auto rounded-panel border border-border bg-card p-2`}>
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-info-content" />
              <span className="mt-2 text-xs font-semibold">
                Loading folders...
              </span>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-muted-foreground">
              <Folder className="h-8 w-8 stroke-[1.5] text-muted-foreground" />
              <span className="mt-2 text-xs font-semibold">
                No subfolders found
              </span>
            </div>
          ) : (
            folders.map((folder: DocumentItem) => (
              <Button variant="unstyled"
                key={folder.id}
                type="button"
                onClick={() => handleNavigate(folder.id, folder.name)}
                className="flex items-center gap-3 rounded-control p-2.5 text-left text-xs font-semibold text-foreground transition hover:bg-background cursor-pointer"
              >
                <Folder className="h-4 w-4 text-warning-content shrink-0" />
                <span className="truncate">{folder.name}</span>
              </Button>
            ))
          )}
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-9 rounded-control border border-border bg-card px-4 text-xs font-semibold text-muted-foreground hover:bg-background"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSelectFolder(currentFolderId);
              onClose();
            }}
            className="h-9 rounded-control bg-primary hover:bg-primary-hover px-5 text-xs font-semibold text-primary-foreground"
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FolderPickerModal;
