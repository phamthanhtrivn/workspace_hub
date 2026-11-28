"use client";

import React from "react";
import { PreviewContent } from "@/features/documents/components/preview/preview-content";
import {
  formatBytes,
  getFileTypeDescription,
  getPreviewFileType,
} from "@/features/documents/utils/documents.utils";
import { DocumentItem } from "@/features/documents/types/documents.types";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";

interface SharedPreviewProps {
  item: DocumentItem;
  previewUrl?: string;
  textContent: string | null;
  isUrlLoading: boolean;
  loadingText: boolean;
  error: Error | string | null;
  onDownload: () => void;
  onRetry?: () => void;
}

export function SharedPreview({
  item,
  previewUrl,
  textContent,
  isUrlLoading,
  loadingText,
  error,
  onDownload,
  onRetry,
}: SharedPreviewProps) {
  const previewType = getPreviewFileType(item.mimeType, item.name);

  return (
    <div className="bg-card rounded-dialog border border-border overflow-hidden flex-1 flex flex-col min-h-[450px]">
      <div className="border-b border-border px-6 py-4.5 bg-background shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DocumentIcon
            item={item}
            iconSize={22}
            className="h-10 w-10 rounded-panel border border-border"
          />
          <div className="min-w-0">
            <h3
              className="truncate text-sm font-semibold text-foreground"
              title={item.name}
            >
              {item.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBytes(item.sizeBytes)} · Document preview
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-semibold break-words">
          {getFileTypeDescription(item.mimeType, item.name)}
        </span>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center bg-card min-h-[400px]">
        <PreviewContent
          key={item.id}
          item={item}
          previewType={previewType}
          previewUrl={previewUrl}
          textContent={textContent}
          isUrlLoading={isUrlLoading}
          loadingText={loadingText}
          error={error}
          handleDownload={onDownload}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}
