"use client";

import React from "react";
import { PreviewContent } from "@/features/documents/components/preview/preview-content";
import { getFileTypeDescription, getPreviewFileType } from "@/features/documents/utils/documents.utils";
import { DocumentItem } from "@/features/documents/types/documents.types";

interface SharedPreviewProps {
  item: DocumentItem;
  previewUrl?: string;
  textContent: string | null;
  isUrlLoading: boolean;
  loadingText: boolean;
  error: any;
  onDownload: () => void;
}

export function SharedPreview({
  item,
  previewUrl,
  textContent,
  isUrlLoading,
  loadingText,
  error,
  onDownload,
}: SharedPreviewProps) {
  const previewType = getPreviewFileType(item.mimeType, item.name);

  return (
    <div className="bg-card rounded-dialog border border-border overflow-hidden flex-1 flex flex-col min-h-[450px]">
      <div className="border-b border-border px-6 py-4.5 bg-background shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Document preview
        </h3>
        <span className="text-xs text-muted-foreground font-semibold">
          {getFileTypeDescription(item.mimeType, item.name)}
        </span>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center bg-card min-h-[400px]">
        <PreviewContent
          item={item}
          previewType={previewType}
          previewUrl={previewUrl}
          textContent={textContent}
          isUrlLoading={isUrlLoading}
          loadingText={loadingText}
          error={error}
          handleDownload={onDownload}
        />
      </div>
    </div>
  );
}
