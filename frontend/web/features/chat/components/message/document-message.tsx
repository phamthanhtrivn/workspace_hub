"use client";

import React from "react";
import { Lock, Download, Eye, FolderOpen } from "lucide-react";
import { useDocumentMessageActions } from "../../hooks/useDocumentMessageActions";
import { DocumentAccessNotice } from "./document-access-notice";
import FilePreviewModal from "@/features/documents/components/preview/file-preview-modal";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { formatBytes } from "@/features/documents/utils/documents.utils";
import { getFileIcon } from "../../utils/document-utils";
import { ChatMessageResponse } from "../../types/chat.types";
import { Button } from "@/components/ui/button";

interface DocumentMessageProps {
  msg: ChatMessageResponse;
  isMe: boolean;
}

export function DocumentMessage({ msg }: DocumentMessageProps) {
  const {
    metadata,
    isLoading,
    error,
    isProcessing,
    previewDocumentId,
    closePreview,
    retry,
    handlePreview,
    handleDownload,
    handleOpenFolder,
  } = useDocumentMessageActions(msg.content || "");

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

  if (error || !metadata || !metadata.hasPermission) {
    return (
      <DocumentAccessNotice
        error={error}
        denied={!error && !!metadata && !metadata.hasPermission}
        busy={isProcessing}
        onRetry={retry}
      />
    );
  }

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
                <Button
                  variant="unstyled"
                  disabled={isProcessing}
                  onClick={handleOpenFolder}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground bg-card border border-border hover:bg-background rounded-control transition-all"
                >
                  <FolderOpen size={14} className="text-muted-foreground" />
                  <span>Open Folder</span>
                </Button>
                <Button
                  variant="warning-soft"
                  disabled={isProcessing}
                  onClick={handleDownload}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-control transition-all"
                >
                  <Download size={14} className="text-warning-content" />
                  <span>Download Zip</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="unstyled"
                  disabled={isProcessing}
                  onClick={handlePreview}
                  className="flex-1 cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground bg-card border border-border hover:bg-background rounded-control transition-all"
                >
                  <Eye size={14} className="text-muted-foreground" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant="info-soft"
                  disabled={isProcessing}
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
      {previewDocumentId === metadata.id &&
      metadata.hasPermission &&
      metadata.type !== DocumentItemType.FOLDER ? (
        <FilePreviewModal
          open
          item={metadata}
          onClose={closePreview}
          onDownload={handleDownload}
        />
      ) : null}
    </div>
  );
}

export default React.memo(DocumentMessage);
