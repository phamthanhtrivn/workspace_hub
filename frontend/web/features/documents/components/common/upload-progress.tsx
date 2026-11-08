"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadState } from "../../types/documents.enums";
import { UPLOAD_SUCCESS_DISMISS_DELAY_MS } from "../../types/documents.constants";
import type { DocumentUploadEntry } from "../../types/upload.types";
import { isUploadPending } from "../../utils/upload-progress";
import { UploadFileRow } from "./upload-file-row";

interface UploadProgressProps {
  uploads: DocumentUploadEntry[];
  onRetry?: (id: string) => void;
  onDismiss?: () => void;
}

export function UploadProgress({
  uploads,
  onRetry,
  onDismiss,
}: UploadProgressProps) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (
      !onDismiss ||
      !uploads.length ||
      !uploads.every((upload) => upload.state === UploadState.SUCCESS)
    )
      return;

    const timeout = setTimeout(onDismiss, UPLOAD_SUCCESS_DISMISS_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [uploads, onDismiss]);

  if (!uploads.length) return null;

  const pending = uploads.filter((upload) =>
    isUploadPending(upload.state),
  ).length;
  const succeeded = uploads.filter(
    (upload) => upload.state === UploadState.SUCCESS,
  ).length;
  const failed = uploads.filter(
    (upload) => upload.state === UploadState.ERROR,
  ).length;
  const skipped = uploads.filter(
    (upload) => upload.state === UploadState.SKIPPED,
  ).length;
  const title = pending
    ? "Uploading files"
    : failed
      ? "Uploads need attention"
      : "Uploads finished";

  return (
    <section
      aria-label="File uploads"
      className="absolute bottom-4 right-4 z-40 w-96 max-w-[calc(100%-2rem)] overflow-hidden rounded-panel border border-border bg-card shadow-panel"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p role="status" className="mt-1 text-xs text-muted-foreground">
            {pending
              ? `${uploads.length - pending} of ${uploads.length} processed`
              : `${succeeded} uploaded · ${failed} failed · ${skipped} skipped`}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand upload list" : "Collapse upload list"}
          onClick={() => setCollapsed((current) => !current)}
          className="relative focus-visible:z-10"
        >
          {collapsed ? (
            <ChevronUp aria-hidden="true" />
          ) : (
            <ChevronDown aria-hidden="true" />
          )}
        </Button>
        {!pending && onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss upload list"
            onClick={onDismiss}
            className="relative focus-visible:z-10"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </header>
      {!collapsed && (
        <ol
          aria-label="Files in upload order"
          className="max-h-[min(24rem,50dvh)] divide-y divide-border overflow-y-auto overscroll-contain"
        >
          {uploads.map((upload) => (
            <UploadFileRow
              key={upload.id}
              upload={upload}
              onRetry={onRetry}
              retryDisabled={pending > 0}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

export default React.memo(UploadProgress);
