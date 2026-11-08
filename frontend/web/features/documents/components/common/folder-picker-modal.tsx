"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { QueryFeedback } from "@/components/common/query-feedback";
import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { Folder, ChevronRight } from "lucide-react";
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
import { useAppSelector } from "@/store/store";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { DOCUMENT_BULK_MESSAGES as M } from "../../types/document-bulk.types";
import { getMoveDestinationBlockReason } from "../../utils/document-bulk";

interface FolderPickerModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: string | null) => void;
  movingItemId: string;
  movingItemIds?: string[];
  busy?: boolean;
  initialFolderId?: string | null;
  projectId?: string;
  projectRootFolderId?: string | null;
  rootLabel?: string;
  confirmLabel?: string;
}

export function FolderPickerModal(props: FolderPickerModalProps) {
  if (!(props.open ?? props.isOpen ?? false)) return null;

  return (
    <FolderPickerContent
      key={`${props.initialFolderId}:${props.projectId}:${props.projectRootFolderId}`}
      {...props}
    />
  );
}

function FolderPickerContent({
  open,
  isOpen,
  onClose,
  onSelectFolder,
  movingItemId,
  movingItemIds,
  busy = false,
  initialFolderId = null,
  projectId,
  projectRootFolderId = null,
  rootLabel,
  confirmLabel = "Move here",
}: FolderPickerModalProps) {
  const userId = useAppSelector((state) => state.auth.userId);
  const isModalOpen = open ?? isOpen ?? false;
  const projectPath = useQuery({
    queryKey: ["folder-picker-root", userId, movingItemId, projectId],
    queryFn: () => documentsApi.getBreadcrumbs(movingItemId),
    enabled: !!userId && !!projectId && !projectRootFolderId,
    retry: false,
  });
  const pickerRootFolderId = projectId
    ? (projectRootFolderId ?? projectPath.data?.[0]?.id ?? null)
    : null;
  const pickerRootName =
    rootLabel ||
    (projectId ? projectPath.data?.[0]?.name : undefined) ||
    NavigationLabel.ROOT;
  const [chosenFolderId, setCurrentFolderId] = useState<string | null>(
    initialFolderId,
  );
  const currentFolderId = chosenFolderId ?? pickerRootFolderId;
  type PickerPath = { id: string | null; name: string }[];
  const [navigationPath, setNavigationPath] = useState<PickerPath | null>(null);
  const path = navigationPath ?? [
    { id: pickerRootFolderId, name: pickerRootName },
  ];
  const setPath: React.Dispatch<React.SetStateAction<PickerPath>> = useCallback(
    (update) =>
      setNavigationPath((previous) =>
        typeof update === "function"
          ? update(
              previous ?? [{ id: pickerRootFolderId, name: pickerRootName }],
            )
          : update,
      ),
    [pickerRootFolderId, pickerRootName],
  );

  const {
    data: response,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "folder-picker",
      userId,
      currentFolderId,
      projectId,
      pickerRootFolderId,
    ],
    queryFn: () =>
      documentsApi.getDocuments({
        folderId: currentFolderId || undefined,
        projectId: projectId && !currentFolderId ? projectId : undefined,
        limit: 1000,
      }),
    enabled:
      isModalOpen && !!userId && (!projectId || Boolean(pickerRootFolderId)),
    gcTime: 0,
  });

  const items = response?.data || [];
  const folders = items.filter(
    (item: DocumentItem) => item.type === DocumentItemType.FOLDER,
  );
  const excludedIds = movingItemIds ?? [movingItemId];
  const currentAccess = useQuery({
    queryKey: ["folder-picker-access", userId, currentFolderId],
    queryFn: () => documentsApi.getAccessibleItem(currentFolderId!),
    enabled: !!userId && !!currentFolderId,
    staleTime: 0,
    retry: false,
  });
  const checkingCurrent =
    busy || isLoading || currentAccess.isFetching || projectPath.isFetching;
  const currentBlockedReason =
    isError || currentAccess.isError || (projectId && !pickerRootFolderId)
      ? M.DROP_UNAVAILABLE
      : currentFolderId
        ? currentAccess.data
          ? getMoveDestinationBlockReason(
              {
                ...currentAccess.data,
                parentFolderId: null,
                isArchived: false,
              },
              projectId,
              excludedIds,
            )
          : M.DROP_UNAVAILABLE
        : undefined;

  const handleNavigate = useCallback(
    (folderId: string | null, name: string) => {
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
    },
    [pickerRootFolderId, pickerRootName, setPath],
  );

  const handlePathClick = useCallback(
    (index: number) => {
      setPath((prev) => {
        const target = prev[index];
        setCurrentFolderId(target.id);

        return prev.slice(0, index + 1);
      });
    },
    [setPath],
  );

  if (!isModalOpen) return null;

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(nextOpen) => !nextOpen && !busy && onClose()}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-md border-border bg-card p-6 text-foreground rounded-dialog`}
      >
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
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Button
                variant="unstyled"
                type="button"
                disabled={busy}
                onClick={() => handlePathClick(idx)}
                className={cn(
                  "relative rounded-xs focus-visible:z-10 transition hover:text-info-content cursor-pointer",
                  idx === path.length - 1
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {p.name === NavigationLabel.ROOT ? "My files" : p.name}
              </Button>
            </React.Fragment>
          ))}
        </div>

        {/* Sub-folders list */}
        {projectPath.isError ? (
          <QueryFeedback
            label="project folder"
            error
            retrying={projectPath.isFetching}
            onRetry={() => projectPath.refetch()}
          />
        ) : null}
        {currentAccess.isError ? (
          <QueryFeedback
            label="folder permissions"
            error
            retrying={currentAccess.isFetching}
            onRetry={() => currentAccess.refetch()}
          />
        ) : null}
        <div
          className={`${dialogLayout.body} mt-3 flex max-h-56 min-h-36 flex-col gap-1 overflow-y-auto rounded-panel border border-border bg-card p-2`}
        >
          {isError ? (
            <QueryFeedback
              label="destination folders"
              error
              retrying={isFetching}
              onRetry={() => refetch()}
            />
          ) : isLoading ? (
            <div
              role="status"
              className="flex flex-1 flex-col items-center justify-center py-8 text-muted-foreground"
            >
              <Spinner size={24} />
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
              <Button
                variant="unstyled"
                key={folder.id}
                type="button"
                disabled={busy}
                title={getMoveDestinationBlockReason(
                  folder,
                  projectId,
                  excludedIds,
                )}
                onClick={() => {
                  const reason = getMoveDestinationBlockReason(
                    folder,
                    projectId,
                    excludedIds,
                  );
                  if (reason) {
                    toast.info(reason);

                    return;
                  }
                  handleNavigate(folder.id, folder.name);
                }}
                className="relative focus-visible:z-10 flex items-center gap-3 rounded-control p-2.5 text-left text-xs font-semibold text-foreground transition hover:bg-background cursor-pointer"
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
            disabled={busy}
            onClick={onClose}
            className="h-9 rounded-control border border-border bg-card px-4 text-xs font-semibold text-muted-foreground hover:bg-background"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={checkingCurrent}
            loading={busy}
            onClick={() => {
              if (checkingCurrent) return;
              if (currentBlockedReason) {
                toast.info(currentBlockedReason);

                return;
              }
              onSelectFolder(currentFolderId);
            }}
            className="h-9 rounded-control bg-primary hover:bg-primary-hover px-5 text-xs font-semibold text-primary-foreground"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FolderPickerModal;
