"use client";

import React from "react";
import { Music } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { DocumentPreviewItem } from "../../types/documents.types";
import { PreviewFileType } from "../../types/documents.enums";
import { PREVIEW_MESSAGES } from "../../types/document-preview.constants";
import { formatBytes } from "../../utils/documents.utils";
import { OfficePreview } from "./office-preview";
import { PreviewStatus } from "./preview-status";

interface PreviewContentProps {
  item: DocumentPreviewItem;
  previewType: PreviewFileType;
  previewUrl?: string;
  textContent: string | null;
  isUrlLoading: boolean;
  loadingText: boolean;
  error: Error | string | null;
  handleDownload: () => void;
  onRetry?: () => void;
  retrying?: boolean;
  fitToContainer?: boolean;
}

export const PreviewContent = React.memo(function PreviewContent({
  item,
  previewType,
  previewUrl,
  textContent,
  isUrlLoading,
  loadingText,
  error,
  handleDownload,
  onRetry,
  retrying,
  fitToContainer = false,
}: PreviewContentProps) {
  const sourceKey = `${item.id}:${previewUrl}`;
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const mediaFailed = failedSource === sourceKey;
  const retryPreview = () => {
    setFailedSource(null);
    setAttempt((previous) => previous + 1);
    onRetry?.();
  };
  const failPreview = () => setFailedSource(sourceKey);

  if (error) {
    return (
      <PreviewStatus
        failed
        onDownload={handleDownload}
        onRetry={retryPreview}
        retrying={retrying}
      />
    );
  }
  if (previewType === PreviewFileType.UNKNOWN) {
    return <PreviewStatus onDownload={handleDownload} />;
  }
  if (isUrlLoading || (previewType === PreviewFileType.TEXT && loadingText)) {
    return (
      <div
        role="status"
        className="flex h-full flex-col items-center justify-center gap-3 py-20 text-muted-foreground"
      >
        <Spinner size={32} />
        <span className="text-sm font-semibold">Loading preview...</span>
      </div>
    );
  }
  if (!previewUrl || mediaFailed) {
    return (
      <PreviewStatus
        failed
        description={
          mediaFailed ? PREVIEW_MESSAGES.mediaErrorDescription : undefined
        }
        onDownload={handleDownload}
        onRetry={retryPreview}
        retrying={retrying}
      />
    );
  }

  switch (previewType) {
    case PreviewFileType.IMAGE:
      return (
        <div
          className={`flex h-full w-full items-center justify-center ${fitToContainer ? "max-h-full" : "max-h-[70vh]"} overflow-hidden rounded-panel bg-overlay/2 p-2`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Authorized preview URLs are short-lived and cannot use the image optimizer. */}
          <img
            key={`${sourceKey}:${attempt}`}
            src={previewUrl}
            alt={item.name}
            onError={failPreview}
            className={`max-w-full ${fitToContainer ? "max-h-full" : "max-h-[68vh]"} rounded-panel border border-border object-contain`}
          />
        </div>
      );
    case PreviewFileType.PDF:
      return (
        <div
          className={`w-full ${fitToContainer ? "h-full min-h-0" : "h-[70vh]"} overflow-hidden rounded-panel border border-border bg-background`}
        >
          <iframe
            key={`${sourceKey}:${attempt}`}
            src={`${previewUrl}#toolbar=0`}
            title={item.name}
            onError={failPreview}
            className="h-full w-full border-0"
          />
        </div>
      );
    case PreviewFileType.VIDEO:
      return (
        <div className="flex w-full items-center justify-center overflow-hidden rounded-panel border border-input bg-media-background text-media-foreground">
          <video
            key={`${sourceKey}:${attempt}`}
            controls
            autoPlay
            aria-label={item.name}
            onError={failPreview}
            className={`w-full ${fitToContainer ? "max-h-full" : "max-h-[70vh]"} outline-none`}
            src={previewUrl}
          />
        </div>
      );
    case PreviewFileType.AUDIO:
      return (
        <div className="flex w-full flex-col items-center justify-center rounded-panel border border-border bg-background p-8 py-16">
          <div className="mb-6 rounded-panel bg-success-soft p-5 text-success-content">
            <Music aria-hidden="true" size={48} />
          </div>
          <span className="mb-1 block max-w-full break-all text-center font-semibold text-foreground">
            {item.name}
          </span>
          <span className="mb-6 block text-xs font-semibold text-muted-foreground">
            {formatBytes(item.sizeBytes)}
          </span>
          <audio
            key={`${sourceKey}:${attempt}`}
            controls
            autoPlay
            aria-label={item.name}
            onError={failPreview}
            src={previewUrl}
            className="w-full max-w-lg outline-none"
          />
        </div>
      );
    case PreviewFileType.TEXT:
      return textContent !== null ? (
        <div
          className={`w-full ${fitToContainer ? "max-h-full" : "max-h-[70vh]"} overflow-auto rounded-panel border border-border bg-background p-4 text-left`}
        >
          <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground">
            {textContent}
          </pre>
        </div>
      ) : (
        <PreviewStatus
          failed
          onDownload={handleDownload}
          onRetry={retryPreview}
          retrying={retrying}
        />
      );
    case PreviewFileType.OFFICE:
      return (
        <OfficePreview
          key={`${sourceKey}:${attempt}`}
          name={item.name}
          previewUrl={previewUrl}
          fitToContainer={fitToContainer}
          onDownload={handleDownload}
          onError={failPreview}
        />
      );
    default:
      return <PreviewStatus onDownload={handleDownload} />;
  }
});
