"use client";

import { logActionError, getActionErrorMessage } from "@/lib/permission-feedback";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { DocumentItem } from "../../types/documents.types";
import { QueryFeedback } from "@/components/common/query-feedback";
import { History } from "lucide-react";
import {
  DocumentItemType,
  DocumentRole,
} from "../../types/documents.enums";
import { ORIGINAL_VERSION_ID } from "../../types/documents.constants";
import { toast } from "sonner";
import { useDocumentUpload } from "../../hooks/useDocumentUpload";
import { VersionUploader } from "./version-uploader";
import { VersionHistoryTable } from "./version-history-table";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionTarget = useMemo(() => item ? { documentId: item.id, isPublic } : undefined, [item, isPublic]);
  const canUploadVersion = item?.userRole === DocumentRole.OWNER || item?.userRole === DocumentRole.EDITOR;
  const { uploads, isUploading, uploadFile, retryFailed } = useDocumentUpload({
    currentFolderId: null,
    enabled: isModalOpen && canUploadVersion,
    enableDropZone: false,
    versionTarget,
    onSuccess: onVersionUploaded,
  });

  const versionsQuery = useQuery({
    queryKey: ["document-versions", item?.id],
    queryFn: () => {
      if (!item) return Promise.resolve([]);
      return isPublic
        ? documentsApi.getPublicVersions(item.id)
        : documentsApi.getVersions(item.id);
    },
    enabled: isModalOpen && !!item && item.type !== DocumentItemType.FOLDER && (item.userRole === DocumentRole.OWNER || item.userRole === DocumentRole.EDITOR),
  });

  const { data: versions = [], isLoading } = versionsQuery;
  const handleDownload = useCallback(
    async (versionId: string) => {
      if (!item) return;
      try {
        const downloadUrl = isPublic
          ? await documentsApi.getPublicDownloadUrl(
              item.id,
              versionId === ORIGINAL_VERSION_ID ? undefined : versionId
            )
          : await documentsApi.getDownloadUrl(
              item.id,
              versionId === ORIGINAL_VERSION_ID ? undefined : versionId
            );
        const link = document.createElement("a");
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Version download started.");
      } catch (err) {
        logActionError("Failed to download version", err);
        toast.error(getActionErrorMessage(err, "Could not generate download link for this version."));
      }
    },
    [item, isPublic]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file && item) void uploadFile(file);
    },
    [item, uploadFile]
  );

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isModalOpen || !item) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${dialogLayout.surface} max-w-2xl border-border bg-card p-6 text-foreground rounded-dialog`}>
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

        <div className={`${dialogLayout.body} mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1`}>
          {canUploadVersion ? (
            <VersionUploader
              uploads={uploads}
              isUploading={isUploading}
              onRetry={(id) => void retryFailed(id)}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onTriggerFileSelect={triggerFileSelect}
            />
          ) : null}

          {versionsQuery.isError && <QueryFeedback label="version history" error retrying={versionsQuery.isFetching} onRetry={() => versionsQuery.refetch()} />}
        {(!versionsQuery.isError || versions.length > 0) && <VersionHistoryTable
            versions={versions}
            isLoading={isLoading}
            item={item}
            onPreviewVersion={onPreviewVersion}
            onDownload={handleDownload}
          />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(VersionManagementModal);
