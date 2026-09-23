"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { toast } from "sonner";
import { useDownloadQueue } from "../components/download/download-queue-provider";
import { DocumentItem } from "../types/documents.types";

export interface UseDocumentActionsOptions {
  currentFolderId: string | null;
  projectId?: string;
  onSuccess?: () => void;
}

export function useDocumentActions({
  currentFolderId,
  projectId,
  onSuccess,
}: UseDocumentActionsOptions) {
  const queryClient = useQueryClient();
  const { enqueueDownload } = useDownloadQueue();

  const refreshExplorer = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["document-quota"] });
    if (onSuccess) onSuccess();
  };

  // Create Folder Mutation
  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      documentsApi.createFolder({
        name,
        parentFolderId: currentFolderId || undefined,
        projectId: !currentFolderId ? projectId : undefined,
      }),
    onSuccess: () => {
      toast.success("Folder created successfully");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create folder");
    },
  });

  // Rename Resource Mutation
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      documentsApi.renameItem(id, name),
    onSuccess: () => {
      toast.success("Resource renamed successfully");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to rename resource");
    },
  });

  // Move Resource Mutation
  const moveMutation = useMutation({
    mutationFn: ({ id, targetFolderId }: { id: string; targetFolderId: string | null }) =>
      documentsApi.moveItem(id, targetFolderId, projectId),
    onSuccess: () => {
      toast.success("Resource moved successfully");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to move resource");
    },
  });

  // Toggle Star Mutation
  const toggleStarMutation = useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) =>
      isStarred ? documentsApi.unStarItem(id) : documentsApi.starItem(id),
    onSuccess: (data) => {
      toast.success(data.isStarred ? "Starred resource" : "Unstarred resource");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update star status");
    },
  });

  // Move to Trash Mutation
  const trashMutation = useMutation({
    mutationFn: (id: string) => documentsApi.archiveItem(id),
    onSuccess: () => {
      toast.success("Moved to trash");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to move to trash");
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => documentsApi.restoreItem(id),
    onSuccess: () => {
      toast.success("Resource restored");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to restore resource");
    },
  });

  // Delete Permanently Mutation
  const deletePermanentlyMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteItemPermanently(id),
    onSuccess: () => {
      toast.success("Permanently deleted resource");
      refreshExplorer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete resource");
    },
  });

  // Single Item Download
  const handleDownloadItem = async (item: DocumentItem) => {
    if (item.type === "FOLDER" || (item.type as any) === "FOLDER") {
      enqueueDownload(item.id, item.name);
      toast.info(`Started downloading folder: ${item.name}`);
    } else {
      try {
        const downloadUrl = await documentsApi.getDownloadUrl(item.id);
        const link = document.createElement("a");
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info(`Downloading file: ${item.name}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to download file");
      }
    }
  };

  return {
    createFolder: createFolderMutation.mutateAsync,
    isCreatingFolder: createFolderMutation.isPending,

    renameResource: renameMutation.mutateAsync,
    isRenaming: renameMutation.isPending,

    moveResource: moveMutation.mutateAsync,
    isMoving: moveMutation.isPending,

    toggleStar: (id: string, isStarred: boolean) =>
      toggleStarMutation.mutate({ id, isStarred }),
    isTogglingStar: toggleStarMutation.isPending,

    moveToTrash: trashMutation.mutateAsync,
    isTrashing: trashMutation.isPending,

    restoreFromTrash: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,

    deletePermanently: deletePermanentlyMutation.mutateAsync,
    isDeletingPermanently: deletePermanentlyMutation.isPending,

    downloadItem: handleDownloadItem,
  };
}
