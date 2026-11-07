"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { getApiErrorMessage } from "@/lib/api-error";
import { documentsApi } from "../api/documents.api";
import { DocumentItemType, UploadState } from "../types/documents.enums";
import type { DocumentNameConflict } from "../types/documents.types";
import type { DocumentUploadDestination, DocumentUploadEntry, DocumentVersionUploadTarget, PendingDocumentUpload } from "../types/upload.types";
import { isUploadPending, uploadDestinationKey, uploadDisplayProgress } from "../utils/upload-progress";
import { useFileDropZone } from "./use-file-drop-zone";

export interface UseDocumentUploadOptions {
  currentFolderId: string | null;
  projectId?: string;
  enabled?: boolean;
  enableDropZone?: boolean;
  versionTarget?: DocumentVersionUploadTarget;
  onSuccess?: () => void;
}

export function useDocumentUpload({
  currentFolderId, projectId, enabled = true, enableDropZone = true, versionTarget, onSuccess,
}: UseDocumentUploadOptions) {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<DocumentUploadEntry[]>([]);
  const [overwriteConflict, setOverwriteConflict] = useState<{
    file: File;
    item: NonNullable<DocumentNameConflict["item"]>;
  } | null>(null);
  const batchRunning = useRef(false);
  const mounted = useRef(true);
  const failedFiles = useRef(new Map<string, PendingDocumentUpload>());
  const overwriteResolver = useRef<((confirmed: boolean) => void) | null>(null);

  const updateUpload = useCallback((id: string, patch: Partial<DocumentUploadEntry>) => {
    if (mounted.current) setUploads(current => current.map(upload => upload.id === id ? { ...upload, ...patch } : upload));
  }, []);

  const requestOverwriteConfirmation = useCallback((file: File, item: NonNullable<DocumentNameConflict["item"]>): Promise<boolean> => {
    if (!mounted.current) return Promise.resolve(false);
    return new Promise(resolve => {
      overwriteResolver.current = resolve;
      setOverwriteConflict({ file, item });
    });
  }, []);

  const confirmOverwrite = useCallback(() => {
    overwriteResolver.current?.(true);
    overwriteResolver.current = null;
    setOverwriteConflict(null);
  }, []);

  const cancelOverwrite = useCallback(() => {
    overwriteResolver.current?.(false);
    overwriteResolver.current = null;
    setOverwriteConflict(null);
  }, []);

  const { mutateAsync } = useMutation({
    mutationFn: async ({ job, overwriteItemId }: { job: PendingDocumentUpload; overwriteItemId?: string }) => {
      const { file, entry, destination } = job;
      const progress = (percent: number, state: UploadState) => updateUpload(entry.id, {
        state, progress: uploadDisplayProgress(percent, state),
      });
      if (destination.version) {
        if (destination.version.isPublic) {
          return documentsApi.uploadNewPublicVersion(destination.version.documentId, file, progress);
        }
        return documentsApi.uploadNewVersion(destination.version.documentId, file, progress);
      }
      return documentsApi.uploadFile(file, destination.folderId,
        !destination.folderId ? destination.projectId : undefined, progress, overwriteItemId);
    },
    onSuccess: (_, { job, overwriteItemId }) => {
      updateUpload(job.entry.id, { state: UploadState.SUCCESS, progress: 100, error: undefined });
      failedFiles.current.delete(job.entry.id);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["document-quota"] });
      if (job.destination.version) {
        void queryClient.invalidateQueries({ queryKey: ["document-versions", job.destination.version.documentId] });
      }
      toast.success(job.destination.version ? "New version uploaded successfully!"
        : overwriteItemId ? `Overwrote ${job.file.name} successfully!` : `Uploaded ${job.file.name} successfully!`);
      onSuccess?.();
    },
  });

  const runBatch = useCallback(async (jobs: PendingDocumentUpload[], retry = false) => {
    if (batchRunning.current || !jobs.length) return;
    batchRunning.current = true;
    if (retry) {
      const retryIds = new Set(jobs.map(job => job.entry.id));
      setUploads(current => current.map(upload => retryIds.has(upload.id)
        ? { ...upload, state: UploadState.QUEUED, progress: 0, error: undefined } : upload));
    } else {
      failedFiles.current.clear();
      // Every selected file is visible before the first request starts.
      setUploads(jobs.map(job => job.entry));
    }
    try {
      for (const job of jobs) {
        if (!mounted.current) break;
        const { file, entry, destination } = job;
        updateUpload(entry.id, { state: UploadState.INITIATING, progress: 0, error: undefined });
        try {
          let overwriteItemId: string | undefined;
          if (!destination.version) {
            const conflict = await documentsApi.getNameConflict({
              name: file.name,
              parentFolderId: destination.folderId || undefined,
              projectId: !destination.folderId ? destination.projectId : undefined,
            });
            if (conflict.exists && conflict.item) {
              if (conflict.item.type === DocumentItemType.FOLDER) {
                updateUpload(entry.id, { state: UploadState.SKIPPED, error: "A folder with this name already exists. Rename the file and try again." });
                failedFiles.current.delete(entry.id);
                continue;
              }
              updateUpload(entry.id, { state: UploadState.AWAITING_OVERWRITE });
              if (!await requestOverwriteConfirmation(file, conflict.item)) {
                updateUpload(entry.id, { state: UploadState.SKIPPED, error: undefined });
                failedFiles.current.delete(entry.id);
                continue;
              }
              overwriteItemId = conflict.item.id;
            }
          }
          await mutateAsync({ job, overwriteItemId });
        } catch (error) {
          const message = getActionErrorMessage(error, getApiErrorMessage(error, `Failed to upload ${file.name}.`));
          updateUpload(entry.id, { state: UploadState.ERROR, error: message });
          failedFiles.current.set(entry.id, job);
          toast.error(message);
        }
      }
    } finally {
      batchRunning.current = false;
    }
  }, [mutateAsync, requestOverwriteConfirmation, updateUpload]);

  const uploadFile = useCallback(async (files: FileList | File[] | File) => {
    if (!enabled || !files) return;
    if (batchRunning.current) {
      toast.info("Uploads are already running. Wait for this queue to finish before adding more files.");
      return;
    }
    const selected = files instanceof File ? [files] : Array.from(files);
    const destination: DocumentUploadDestination = { folderId: currentFolderId, projectId, version: versionTarget };
    await runBatch(selected.map(file => ({
      file, destination,
      entry: { id: crypto.randomUUID(), fileName: file.name, sizeBytes: file.size, state: UploadState.QUEUED, progress: 0 },
    })));
  }, [enabled, currentFolderId, projectId, versionTarget, runBatch]);

  const retryFailed = useCallback(async (id?: string) => {
    if (!enabled || batchRunning.current) return;
    const jobs = Array.from(failedFiles.current.values()).filter(job => !id || job.entry.id === id);
    const destination: DocumentUploadDestination = { folderId: currentFolderId, projectId, version: versionTarget };
    if (jobs.some(job => uploadDestinationKey(job.destination) !== uploadDestinationKey(destination))) {
      toast.error("Return to the original folder or document to retry these uploads.");
      return;
    }
    await runBatch(jobs, true);
  }, [enabled, currentFolderId, projectId, versionTarget, runBatch]);

  const dismissUploads = useCallback(() => {
    if (batchRunning.current) return;
    failedFiles.current.clear();
    setUploads([]);
  }, []);

  const isDraggingOver = useFileDropZone(enabled && enableDropZone && !versionTarget, uploadFile);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      overwriteResolver.current?.(false);
      overwriteResolver.current = null;
    };
  }, []);

  return {
    uploads, isDraggingOver, isUploading: uploads.some(upload => isUploadPending(upload.state)),
    overwriteConflict, uploadFile, retryFailed, dismissUploads, confirmOverwrite, cancelOverwrite,
  };
}
