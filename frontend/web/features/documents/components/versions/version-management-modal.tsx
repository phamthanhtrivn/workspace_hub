"use client";

import {
  logActionError,
  getActionErrorMessage,
} from "@/lib/permission-feedback";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { DocumentItem, DocumentVersion } from "../../types/documents.types";
import { QueryFeedback } from "@/components/common/query-feedback";
import { History } from "lucide-react";
import { DocumentItemType, DocumentRole } from "../../types/documents.enums";
import { ORIGINAL_VERSION_ID } from "../../types/documents.constants";
import { toast } from "sonner";
import { useVersionUpload } from "./version-upload-provider";
import { VERSION_MESSAGES } from "../../types/document-version.constants";
import { invalidateDocumentVersion } from "../../utils/document-cache";
import { VersionUploader } from "./version-uploader";
import { VersionHistoryTable } from "./version-history-table";
import { VersionDeleteDialog } from "./version-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VersionManagementModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  onPreviewVersion: (item: DocumentItem, versionId: string) => void;
  isPublic?: boolean;
  onVersionUploaded?: () => void;
}

export function VersionManagementModal({
  open,
  isOpen,
  onClose,
  item,
  onPreviewVersion,
  isPublic = false,
  onVersionUploaded,
}: VersionManagementModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingVersion, setDeletingVersion] =
    React.useState<DocumentVersion | null>(null);
  const versionTarget = useMemo(
    () => (item ? { documentId: item.id, isPublic } : undefined),
    [item, isPublic],
  );
  const canUploadVersion =
    !item?.isStarred &&
    (item?.userRole === DocumentRole.OWNER ||
      item?.userRole === DocumentRole.EDITOR);
  const { isUploading, uploadVersion } = useVersionUpload();
  const currentVersionMutation = useMutation({
    mutationFn: (versionId: string) => {
      if (!item || !canUploadVersion)
        return Promise.reject(new Error("Document is not editable"));

      return documentsApi.setCurrentVersion(item.id, versionId, isPublic);
    },
    onSuccess: (updated) => {
      void invalidateDocumentVersion(queryClient, updated.id);
      onVersionUploaded?.();
      toast.success(VERSION_MESSAGES.currentSaved);
    },
    onError: (error) =>
      toast.error(getActionErrorMessage(error, VERSION_MESSAGES.currentFailed)),
  });

  const versionsQuery = useQuery({
    queryKey: ["document-versions", item?.id],
    queryFn: () => {
      if (!item) return Promise.resolve([]);

      return isPublic
        ? documentsApi.getPublicVersions(item.id)
        : documentsApi.getVersions(item.id);
    },
    enabled:
      isModalOpen &&
      !!item &&
      item.type !== DocumentItemType.FOLDER &&
      (item.userRole === DocumentRole.VIEWER ||
        item.userRole === DocumentRole.OWNER ||
        item.userRole === DocumentRole.EDITOR),
  });

  const { data: versions = [], isLoading } = versionsQuery;
  const handleDownload = useCallback(
    async (versionId: string) => {
      if (!item) return;
      try {
        const downloadUrl = isPublic
          ? await documentsApi.getPublicDownloadUrl(
              item.id,
              versionId === ORIGINAL_VERSION_ID ? undefined : versionId,
            )
          : await documentsApi.getDownloadUrl(
              item.id,
              versionId === ORIGINAL_VERSION_ID ? undefined : versionId,
            );
        const link = document.createElement("a");
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Version download started.");
      } catch (err) {
        logActionError("Failed to download version", err);
        toast.error(
          getActionErrorMessage(
            err,
            "Could not generate download link for this version.",
          ),
        );
      }
    },
    [item, isPublic],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length !== 1) {
        toast.error(VERSION_MESSAGES.singleFile);

        return;
      }
      if (
        !versionTarget ||
        !canUploadVersion ||
        currentVersionMutation.isPending ||
        deletingVersion
      )
        return;
      void uploadVersion(files[0], versionTarget, onVersionUploaded);
    },
    [
      versionTarget,
      canUploadVersion,
      currentVersionMutation.isPending,
      deletingVersion,
      uploadVersion,
      onVersionUploaded,
    ],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length) handleFiles(files);
    },
    [handleFiles],
  );

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isModalOpen || !item) return null;

  return (
    <>
      <Dialog
        open={isModalOpen}
        onOpenChange={(nextOpen) => !nextOpen && onClose()}
      >
        <DialogContent
          className={`${dialogLayout.surface} max-w-2xl border-border bg-card p-6 text-foreground rounded-dialog`}
        >
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-info-soft text-info-content ring-1 ring-ring">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Version management
              </DialogTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground font-semibold max-w-md">
                {item.name}
              </p>
            </div>
          </DialogHeader>

          <div
            className={`${dialogLayout.body} mt-4 space-y-4 max-h-[60vh] overflow-y-auto p-1`}
          >
            {canUploadVersion ? (
              <VersionUploader
                isUploading={isUploading}
                disabled={currentVersionMutation.isPending || !!deletingVersion}
                onFilesDropped={handleFiles}
                fileInputRef={fileInputRef}
                onFileChange={handleFileChange}
                onTriggerFileSelect={triggerFileSelect}
              />
            ) : null}

            {versionsQuery.isError && (
              <QueryFeedback
                label="version history"
                error
                retrying={versionsQuery.isFetching}
                onRetry={() => versionsQuery.refetch()}
              />
            )}
            {(!versionsQuery.isError || versions.length > 0) && (
              <VersionHistoryTable
                key={`${item.id}:${versions.find((version) => version.isCurrent)?.id ?? "none"}`}
                versions={versions}
                isLoading={isLoading}
                item={item}
                onPreviewVersion={onPreviewVersion}
                onDownload={handleDownload}
                canChangeCurrent={canUploadVersion}
                savingCurrent={currentVersionMutation.isPending}
                uploadInProgress={isUploading || !!deletingVersion}
                canDeleteVersion={
                  !item.isStarred && item.userRole === DocumentRole.OWNER
                }
                onDeleteVersion={setDeletingVersion}
                onSaveCurrent={(versionId) =>
                  currentVersionMutation.mutate(versionId)
                }
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {deletingVersion && (
        <VersionDeleteDialog
          item={item}
          version={deletingVersion}
          isPublic={isPublic}
          onClose={() => setDeletingVersion(null)}
          onDeleted={onVersionUploaded}
        />
      )}
    </>
  );
}

export default React.memo(VersionManagementModal);
