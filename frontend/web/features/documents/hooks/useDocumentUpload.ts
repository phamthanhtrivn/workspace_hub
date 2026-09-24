"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { DocumentItemType, UploadState } from "../types/documents.enums";
import { DocumentNameConflict } from "../types/documents.types";
import { toast } from "sonner";

export interface UseDocumentUploadOptions {
  currentFolderId: string | null;
  projectId?: string;
  enabled?: boolean;
  onSuccess?: () => void;
}

export function useDocumentUpload({
  currentFolderId,
  projectId,
  enabled = true,
  onSuccess,
}: UseDocumentUploadOptions) {
  const queryClient = useQueryClient();
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [overwriteConflict, setOverwriteConflict] = useState<{
    file: File;
    item: NonNullable<DocumentNameConflict["item"]>;
  } | null>(null);
  const dragCounter = useRef(0);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overwriteResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null,
  );

  const requestOverwriteConfirmation = useCallback(
    (
      file: File,
      item: NonNullable<DocumentNameConflict["item"]>,
    ): Promise<boolean> =>
      new Promise((resolve) => {
        overwriteResolverRef.current = resolve;
        setOverwriteConflict({ file, item });
      }),
    [],
  );

  const confirmOverwrite = useCallback(() => {
    overwriteResolverRef.current?.(true);
    overwriteResolverRef.current = null;
    setOverwriteConflict(null);
  }, []);

  const cancelOverwrite = useCallback(() => {
    overwriteResolverRef.current?.(false);
    overwriteResolverRef.current = null;
    setOverwriteConflict(null);
  }, []);

  // File Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      overwriteItemId,
    }: {
      file: File;
      overwriteItemId?: string;
    }) => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      setUploadState(UploadState.UPLOADING);
      setUploadProgress(0);
      setUploadingFileName(file.name);

      return documentsApi.uploadFile(
        file,
        currentFolderId || undefined,
        !currentFolderId ? projectId : undefined,
        (percent) => setUploadProgress(percent),
        overwriteItemId,
      );
    },
    onSuccess: (_, { file, overwriteItemId }) => {
      toast.success(
        overwriteItemId
          ? `Overwrote ${file.name} successfully!`
          : `Uploaded ${file.name} successfully!`,
      );
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-quota"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any, { file }) => {
      setUploadState(UploadState.ERROR);
      toast.error(err?.response?.data?.message || `Failed to upload ${file.name}`);
    },
  });

  const handleFileUpload = useCallback(
    async (files: FileList | File[] | File) => {
      if (!enabled) return;
      if (!files) return;
      const fileArray: File[] =
        files instanceof File
          ? [files]
          : Array.from(files);

      if (fileArray.length === 0) return;

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          const conflict = await documentsApi.getNameConflict({
            name: file.name,
            parentFolderId: currentFolderId || undefined,
            projectId: !currentFolderId ? projectId : undefined,
          });
          let overwriteItemId: string | undefined;

          if (conflict.exists && conflict.item) {
            if (conflict.item.type === DocumentItemType.FOLDER) {
              toast.error(
                `A folder named "${conflict.item.name}" already exists in this location`,
              );
              continue;
            }

            const shouldOverwrite = await requestOverwriteConfirmation(
              file,
              conflict.item,
            );
            if (!shouldOverwrite) {
              continue;
            }
            overwriteItemId = conflict.item.id;
          }

          await uploadMutation.mutateAsync({ file, overwriteItemId });
        } catch (err) {
          console.error("Failed to upload file:", file.name, err);
        }
      }

      setUploadState(UploadState.SUCCESS);
      setUploadProgress(100);

      resetTimeoutRef.current = setTimeout(() => {
        setUploadState(UploadState.IDLE);
        setUploadProgress(0);
        setUploadingFileName("");
      }, 3000);
    },
    [
      currentFolderId,
      enabled,
      projectId,
      requestOverwriteConfirmation,
      uploadMutation,
    ]
  );

  // Window drag events
  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, [enabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  }, [enabled]);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
  }, [enabled]);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      dragCounter.current = 0;

      if (enabled && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [enabled, handleFileUpload]
  );

  useEffect(() => {
    if (!enabled) {
      setIsDraggingOver(false);
      dragCounter.current = 0;
      return;
    }
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [enabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    uploadState,
    uploadProgress,
    uploadingFileName,
    overwriteConflict,
    isDraggingOver,
    isUploading: uploadMutation.isPending,
    uploadFile: handleFileUpload,
    confirmOverwrite,
    cancelOverwrite,
  };
}
