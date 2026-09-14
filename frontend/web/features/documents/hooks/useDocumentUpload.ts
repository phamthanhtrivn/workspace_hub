"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { UploadState } from "../types/documents.enums";
import { toast } from "sonner";

export interface UseDocumentUploadOptions {
  currentFolderId: string | null;
  onSuccess?: () => void;
}

export function useDocumentUpload({ currentFolderId, onSuccess }: UseDocumentUploadOptions) {
  const queryClient = useQueryClient();
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // File Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
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
        (percent) => setUploadProgress(percent)
      );
    },
    onSuccess: (_, file) => {
      toast.success(`Uploaded ${file.name} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-quota"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any, file) => {
      setUploadState(UploadState.ERROR);
      toast.error(err?.response?.data?.message || `Failed to upload ${file.name}`);
    },
  });

  const handleFileUpload = useCallback(
    async (files: FileList | File[] | File) => {
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
          await uploadMutation.mutateAsync(file);
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
    [uploadMutation]
  );

  // Window drag events
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      dragCounter.current = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [handleFileUpload]
  );

  useEffect(() => {
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
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    uploadState,
    uploadProgress,
    uploadingFileName,
    isDraggingOver,
    isUploading: uploadMutation.isPending,
    uploadFile: handleFileUpload,
  };
}
