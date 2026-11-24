"use client";

import { Download, FileQuestion, RefreshCw, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREVIEW_MESSAGES } from "../../types/document-preview.constants";

interface PreviewStatusProps {
  failed?: boolean;
  description?: string;
  onDownload: () => void;
  onRetry?: () => void;
  retrying?: boolean;
}

export function PreviewStatus({
  failed = false,
  description,
  onDownload,
  onRetry,
  retrying,
}: PreviewStatusProps) {
  const Icon = failed ? FileWarning : FileQuestion;

  return (
    <div
      role="status"
      className="flex h-full min-h-64 flex-col items-center justify-center gap-5 p-6 text-center"
    >
      <div
        className={`rounded-panel p-4 ${failed ? "bg-warning-soft text-warning-content" : "bg-muted text-muted-foreground"}`}
      >
        <Icon aria-hidden="true" size={36} />
      </div>
      <div className="max-w-md">
        <h4 className="text-base font-semibold text-foreground">
          {failed
            ? PREVIEW_MESSAGES.errorTitle
            : PREVIEW_MESSAGES.unsupportedTitle}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description ??
            (failed
              ? PREVIEW_MESSAGES.errorDescription
              : PREVIEW_MESSAGES.unsupportedDescription)}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {failed && onRetry && (
          <Button variant="outline" onClick={onRetry} disabled={retrying}>
            <RefreshCw aria-hidden="true" />
            {PREVIEW_MESSAGES.retry}
          </Button>
        )}
        <Button onClick={onDownload}>
          <Download aria-hidden="true" />
          {PREVIEW_MESSAGES.download}
        </Button>
      </div>
    </div>
  );
}
