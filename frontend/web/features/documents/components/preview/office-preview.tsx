"use client";

import React from "react";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OFFICE_VIEWER_BASE_URL } from "../../types/documents.constants";
import { PREVIEW_MESSAGES } from "../../types/document-preview.constants";
import { canUseOfficeViewer } from "../../utils/office-preview.utils";
import { PreviewStatus } from "./preview-status";

interface OfficePreviewProps {
  name: string;
  previewUrl: string;
  fitToContainer: boolean;
  onDownload: () => void;
  onError: () => void;
}

export function OfficePreview({
  name,
  previewUrl,
  fitToContainer,
  onDownload,
  onError,
}: OfficePreviewProps) {
  if (!canUseOfficeViewer(previewUrl)) {
    return (
      <PreviewStatus
        description={PREVIEW_MESSAGES.officeLocalDescription}
        onDownload={onDownload}
      />
    );
  }

  return (
    <div
      className={`flex w-full flex-col gap-3 ${fitToContainer ? "h-full min-h-0" : "h-[70vh]"}`}
    >
      <div className="min-h-48 flex-1 overflow-hidden rounded-panel border border-border bg-background">
        <iframe
          src={`${OFFICE_VIEWER_BASE_URL}?src=${encodeURIComponent(previewUrl)}`}
          title={name}
          onError={onError}
          className="h-full w-full border-0"
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <p className="flex min-w-0 flex-1 basis-56 items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {PREVIEW_MESSAGES.officeHelp}
        </p>
        <Button variant="outline" onClick={onDownload}>
          <Download aria-hidden="true" />
          {PREVIEW_MESSAGES.download}
        </Button>
      </div>
    </div>
  );
}
