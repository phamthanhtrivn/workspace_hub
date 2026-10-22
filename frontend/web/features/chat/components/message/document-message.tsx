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
import { Button } from "@/components/ui/button";

interface DocumentMessageProps {
  msg: ChatMessageResponse;
  isMe: boolean;
}

const DocumentMessage = React.memo(function DocumentMessage({
  msg,
  isMe,
}: DocumentMessageProps) {
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
        <div className="bg-background border border-border rounded-panel p-4 max-w-sm min-w-0 w-full [overflow-wrap:anywhere] animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-accent rounded-panel" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-accent rounded-sm w-3/4" />
            <div className="h-3 bg-accent rounded-sm w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !metadata) {
    return (
      <div className="flex flex-col items-center my-3 w-full">
        <div className="bg-destructive-soft border border-border rounded-panel p-4 max-w-sm min-w-0 w-full [overflow-wrap:anywhere] flex items-center gap-3 text-destructive-content">
          <Lock size={20} className="shrink-0 text-destructive-content" />
          <div className="text-xs font-semibold">
            Document unavailable or removed
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
        toast.error("Failed to load document preview.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate download link.");
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
      toast.error("Download failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFolder = () => {
    router.push(`/documents?view=SHARED&folderId=${metadata.id}`);
  };

  const themeClasses =
    metadata.type === DocumentItemType.FOLDER
      ? "bg-warning-soft/30 border-border"
      : "bg-background border-border";

  return (
    <div
      className={`border rounded-panel p-4 max-w-sm min-w-0 w-full [overflow-wrap:anywhere] transition-all duration-200 ${themeClasses}`}
    >
      <div className="flex items-start gap-3">
        {/* File/Folder Icon */}
        <div className="p-2.5 bg-card border border-border rounded-panel">
          {getFileIcon(
            metadata.type as DocumentItemType,
            metadata.mimeType,
            metadata.name,
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4
            className="text-sm font-semibold text-foreground leading-snug truncate"
            title={metadata.name}
          >
            {metadata.name}
          </h4>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            {metadata.type === DocumentItemType.FOLDER
              ? "Folder"
              : formatBytes(metadata.sizeBytes)}
            <span className="mx-1.5">•</span>
            <span>{metadata.ownerName || metadata.ownerEmail}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons based on Permissions */}
      <div className="mt-4 border-t border-border pt-3 flex items-center justify-between gap-2.5">
        {metadata.hasPermission ? (
          <>
            {metadata.type === DocumentItemType.FOLDER ? (
              <>
                <Button variant="unstyled"
                  onClick={handleOpenFolder}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground bg-card border border-border hover:bg-background rounded-control transition-all"
                >
                  <FolderOpen size={14} className="text-muted-foreground" />
                  <span>Open Folder</span>
                </Button>
                <Button variant="warning-soft"
                  onClick={handleDownload}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-control transition-all"
                >
                  <Download size={14} className="text-warning-content" />
                  <span>Download Zip</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="unstyled"
                  onClick={handlePreview}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground bg-card border border-border hover:bg-background rounded-control transition-all"
                >
                  <Eye size={14} className="text-muted-foreground" />
                  <span>Preview</span>
                </Button>
                <Button variant="info-soft"
                  onClick={handleDownload}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-control transition-all"
                >
                  <Download size={14} className="text-info-content" />
                  <span>Download</span>
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="w-full flex items-center gap-2.5 text-destructive-content bg-destructive-soft/50 p-2.5 rounded-panel border border-border">
            <Lock size={15} className="shrink-0 text-destructive-content" />
            <div className="text-xs font-semibold leading-normal">
              Access denied. Shared by{" "}
              <span className="underline">{metadata.ownerEmail}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DocumentMessage;
