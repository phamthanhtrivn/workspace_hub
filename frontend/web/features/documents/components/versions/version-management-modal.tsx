"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { DocumentItem } from "../../types/documents.types";
import { X, History } from "lucide-react";
import {
  DocumentItemType,
  UploadState,
  DocumentRole,
} from "../../types/documents.enums";
import { ORIGINAL_VERSION_ID } from "../../types/documents.constants";
import { toast } from "sonner";
import { VersionUploader } from "./version-uploader";
import { VersionHistoryTable } from "./version-history-table";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface VersionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  onPreviewVersion: (item: DocumentItem, versionId: string) => void;
  isPublic?: boolean;
  onVersionUploaded?: () => void;
}

function VersionManagementModal({
  isOpen,
  onClose,
  item,
  onPreviewVersion,
  isPublic = false,
  onVersionUploaded,
}: VersionManagementModalProps) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["document-versions", item?.id],
    queryFn: () => {
      if (!item) return Promise.resolve([]);
      return isPublic
        ? documentsApi.getPublicVersions(item.id)
        : documentsApi.getVersions(item.id);
    },
    enabled: isOpen && !!item && item.type !== DocumentItemType.FOLDER,
  });

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
        toast.success(
          intl.formatMessage({ id: "documents.versionDownloadStarted" }),
        );
      } catch (err) {
        console.error("Failed to download version", err);
        toast.error(
          intl.formatMessage({ id: "documents.versionDownloadLinkFailed" }),
        );
      }
    },
    [item, isPublic, intl],
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
          progressCallback,
        );
      } else {
        return documentsApi.uploadNewVersion(item!.id, file, progressCallback);
      }
    },
    onSuccess: () => {
      setUploadState(UploadState.SUCCESS);
      toast.success(
        intl.formatMessage({ id: "documents.newVersionUploaded" }),
      );

      // Invalidate queries to refresh lists and quota
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
        intl.formatMessage({ id: "documents.uploadNewVersionFailed" });
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
    [item, uploadVersionMutation],
  );

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isOpen || !item || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-50 p-6 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 leading-tight">
                {intl.formatMessage({ id: "documents.versionManagement" })}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5 truncate max-w-lg">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors border border-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] flex-1 bg-white">
          {/* Upload New Version Widget */}
          {item.userRole !== DocumentRole.VIEWER && (
            <VersionUploader
              uploadState={uploadState}
              uploadProgress={uploadProgress}
              uploadingFileName={uploadingFileName}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onTriggerFileSelect={triggerFileSelect}
            />
          )}

          {/* Versions Table */}
          <VersionHistoryTable
            versions={versions}
            isLoading={isLoading}
            item={item}
            onPreviewVersion={onPreviewVersion}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default React.memo(VersionManagementModal);
