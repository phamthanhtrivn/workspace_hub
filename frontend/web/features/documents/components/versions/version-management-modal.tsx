"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { DocumentItem } from "../../types/documents.types";
import { QueryFeedback } from "@/components/common/query-feedback";
import { History } from "lucide-react";
import {
  DocumentItemType,
  UploadState,
  DocumentRole,
} from "../../types/documents.enums";
import { ORIGINAL_VERSION_ID } from "../../types/documents.constants";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const versionsQuery = useQuery({
    queryKey: ["document-versions", item?.id],
    queryFn: () => {
      if (!item) return Promise.resolve([]);
      return isPublic
        ? documentsApi.getPublicVersions(item.id)
        : documentsApi.getVersions(item.id);
    },
    enabled: isModalOpen && !!item && item.type !== DocumentItemType.FOLDER,
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
        console.error("Failed to download version", err);
        toast.error("Could not generate download link for this version.");
      }
    },
    [item, isPublic]
  );

  const uploadVersionMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      setUploadingFileName(file.name);
      setUploadState(UploadState.INITIATING);
      setUploadProgress(0);

      const progressCallback = (percent: number, state: UploadState) => {
        setUploadState(state);
        setUploadProgress(percent);
      };

      if (isPublic) {
        return documentsApi.uploadNewPublicVersion(
          item!.id,
          file,
          progressCallback
        );
      } else {
        return documentsApi.uploadNewVersion(item!.id, file, progressCallback);
      }
    },
    onSuccess: () => {
      setUploadState(UploadState.SUCCESS);
      toast.success("New version uploaded successfully!");

      void queryClient.invalidateQueries({
        queryKey: ["document-versions", item!.id],
      });
      if (!isPublic) {
        void queryClient.invalidateQueries({ queryKey: ["documents"] });
        void queryClient.invalidateQueries({ queryKey: ["document-quota"] });
      }

      onVersionUploaded?.();

      setTimeout(() => {
        setUploadState(UploadState.IDLE);
        setUploadingFileName("");
        setUploadProgress(0);
      }, 2000);
    },
    onError: (err: any) => {
      console.error("Failed to upload version", err);
      setUploadState(UploadState.ERROR);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to upload new version.";
      toast.error(errMsg);
      setTimeout(() => {
        setUploadState(UploadState.IDLE);
      }, 3000);
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !item) return;
      uploadVersionMutation.mutate({ file });
    },
    [item, uploadVersionMutation]
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
          {item.userRole !== DocumentRole.VIEWER ? (
            <VersionUploader
              uploadState={uploadState}
              uploadProgress={uploadProgress}
              uploadingFileName={uploadingFileName}
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
