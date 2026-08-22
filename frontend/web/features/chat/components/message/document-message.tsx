"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Download, Eye, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { formatBytes } from "@/features/documents/utils/documents.utils";
import { getFileIcon } from "../../utils/document-utils";
import { ChatMessageResponse } from "../../types/chat.types";
import {
  METADATA_QUERY_KEY,
  METADATA_STALE_TIME,
} from "../../types/document.constants";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface DocumentMessageProps {
  msg: ChatMessageResponse;
  isMe: boolean;
}

const DocumentMessage = React.memo(function DocumentMessage({
  msg,
  isMe,
}: DocumentMessageProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const documentId = msg.content || "";
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: metadata,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [METADATA_QUERY_KEY, documentId],
    queryFn: async () => {
      if (!documentId) return null;
      return documentsApi.getChatMetadata(documentId);
    },
    enabled: !!documentId,
    staleTime: METADATA_STALE_TIME,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center my-3 w-full">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-w-sm w-full animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded-sm w-3/4" />
            <div className="h-3 bg-slate-200 rounded-sm w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !metadata) {
    return (
      <div className="flex flex-col items-center my-3 w-full">
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 max-w-sm w-full flex items-center gap-3 text-rose-700">
          <Lock size={20} className="shrink-0 text-rose-500" />
          <div className="text-xs font-semibold">
            {intl.formatMessage({ id: "chat.documentUnavailable" })}
          </div>
        </div>
      </div>
    );
  }

  const handlePreview = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const previewUrl = await documentsApi.getPreviewUrl(metadata.id);
      if (previewUrl) {
        window.open(previewUrl, "_blank");
      } else {
        toast.error(intl.formatMessage({ id: "documents.previewLoadFailed" }));
      }
    } catch (err) {
      console.error(err);
      toast.error(intl.formatMessage({ id: "documents.downloadLinkFailed" }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (metadata.type === DocumentItemType.FOLDER) {
        await documentsApi.downloadFolderAsZip(metadata.id, metadata.name);
      } else {
        const downloadUrl = await documentsApi.getDownloadUrl(metadata.id);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = metadata.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      toast.error(intl.formatMessage({ id: "documents.downloadFailed" }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFolder = () => {
    router.push(`/documents?view=SHARED&folderId=${metadata.id}`);
  };

  const themeClasses =
    metadata.type === DocumentItemType.FOLDER
      ? "bg-amber-50/30 border-amber-200/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)]"
      : "bg-slate-50/50 border-slate-200/60 hover:shadow-[0_8px_30px_rgba(30,41,59,0.06)]";

  return (
    <div
      className={`border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] max-w-sm w-full transition-all duration-300 ${themeClasses}`}
    >
      <div className="flex items-start gap-3">
        {/* File/Folder Icon */}
        <div className="p-2.5 bg-white border border-slate-100 rounded-xl shadow-xs">
          {getFileIcon(
            metadata.type as DocumentItemType,
            metadata.mimeType,
            metadata.name,
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4
            className="text-sm font-bold text-slate-800 leading-snug truncate"
            title={metadata.name}
          >
            {metadata.name}
          </h4>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {metadata.type === DocumentItemType.FOLDER
              ? intl.formatMessage({ id: "documents.folder" })
              : formatBytes(metadata.sizeBytes)}
            <span className="mx-1.5">•</span>
            <span>{metadata.ownerName || metadata.ownerEmail}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons based on Permissions */}
      <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between gap-2.5">
        {metadata.hasPermission ? (
          <>
            {metadata.type === DocumentItemType.FOLDER ? (
              <>
                <button
                  onClick={handleOpenFolder}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <FolderOpen size={14} className="text-slate-500" />
                  <span>{intl.formatMessage({ id: "documents.openFolder" })}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/80 rounded-xl transition-all"
                >
                  <Download size={14} className="text-amber-600" />
                  <span>{intl.formatMessage({ id: "documents.downloadZip" })}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePreview}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <Eye size={14} className="text-slate-500" />
                  <span>{intl.formatMessage({ id: "documents.preview" })}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100/80 rounded-xl transition-all"
                >
                  <Download size={14} className="text-violet-600" />
                  <span>{intl.formatMessage({ id: "documents.download" })}</span>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full flex items-center gap-2.5 text-rose-600 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">
            <Lock size={15} className="shrink-0 text-rose-500" />
            <div className="text-[11px] font-bold leading-normal">
              {intl.formatMessage(
                { id: "chat.documentAccessDenied" },
                {
                  owner: (
                    <span className="underline">{metadata.ownerEmail}</span>
                  ),
                },
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DocumentMessage;
