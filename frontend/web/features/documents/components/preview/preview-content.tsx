"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { PreviewFileType } from "../../types/documents.enums";
import { formatBytes } from "../../utils/documents.utils";
import { OFFICE_VIEWER_BASE_URL } from "../../types/documents.constants";
import {
  X,
  Download,
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";


interface PreviewContentProps {
  item: DocumentItem;
  previewType: PreviewFileType;
  previewUrl?: string;
  textContent: string | null;
  isUrlLoading: boolean;
  loadingText: boolean;
  error: any;
  handleDownload: () => void;
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
  fitToContainer = false,
}: PreviewContentProps) {
  if (isUrlLoading || (previewType === PreviewFileType.TEXT && loadingText)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-20">
        <Loader2
          className="animate-spin text-info-content"
          size={36}
        />
        <span className="text-sm font-semibold">
          Loading preview...
        </span>
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 py-20">
        <div className="bg-destructive-soft p-4 rounded-full text-destructive-content">
          <X size={32} />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">
            Preview not available
          </h4>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            This file type cannot be previewed directly in the browser.
          </p>
        </div>
        <Button variant="default"
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-control hover:opacity-90 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-opacity"
        >
          <Download size={14} />
          <span>Download file</span>
        </Button>
      </div>
    );
  }

  switch (previewType) {
    case PreviewFileType.IMAGE:
      return (
        <div className={`flex items-center justify-center w-full h-full ${fitToContainer ? "max-h-full" : "max-h-[70vh]"} bg-overlay/2 rounded-panel p-2 overflow-hidden`}>
          <img
            src={previewUrl}
            alt={item.name}
            className={`max-w-full ${fitToContainer ? "max-h-full" : "max-h-[68vh]"} object-contain rounded-panel border border-border`}
          />
        </div>
      );

    case PreviewFileType.PDF:
      return (
        <div className={`w-full ${fitToContainer ? "h-full min-h-0" : "h-[70vh]"} rounded-panel overflow-hidden border border-border bg-background`}>
          <iframe
            src={`${previewUrl}#toolbar=0`}
            className="w-full h-full border-0"
            title={item.name}
          />
        </div>
      );

    case PreviewFileType.VIDEO:
      return (
        <div className="flex items-center justify-center w-full bg-media-background text-media-foreground rounded-panel overflow-hidden border border-input">
          <video
            controls
            autoPlay
            className={`w-full ${fitToContainer ? "max-h-full" : "max-h-[70vh]"} outline-none`}
            src={previewUrl}
          />
        </div>
      );

    case PreviewFileType.AUDIO:
      return (
        <div className="flex flex-col items-center justify-center w-full p-8 py-16 bg-background border border-border rounded-panel">
          <div className="bg-success-soft p-5 rounded-full text-success-content mb-6 animate-pulse">
            <Music size={48} />
          </div>
          <span className="block font-semibold text-foreground text-center mb-1 max-w-md truncate">
            {item.name}
          </span>
          <span className="block text-xs font-semibold text-muted-foreground mb-6">
            {formatBytes(item.sizeBytes)}
          </span>
          <audio
            controls
            autoPlay
            src={previewUrl}
            className="w-full max-w-lg outline-none"
          />
        </div>
      );

    case PreviewFileType.TEXT:
      if (textContent !== null) {
        return (
          <div className={`w-full ${fitToContainer ? "max-h-full" : "max-h-[70vh]"} bg-background border border-border rounded-panel p-4 overflow-auto text-left`}>
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-all leading-relaxed">
              {textContent}
            </pre>
          </div>
        );
      }
      return null;

    case PreviewFileType.OFFICE:
      const officeViewerUrl = `${OFFICE_VIEWER_BASE_URL}?src=${encodeURIComponent(previewUrl)}`;
      return (
        <div className={`w-full ${fitToContainer ? "h-full min-h-0" : "h-[70vh]"} rounded-panel overflow-hidden border border-border bg-background relative group`}>
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0"
            title={item.name}
          />
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-panel bg-card border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-background transition-all cursor-pointer animate-in fade-in shadow-panel"
          >
            <ExternalLink size={12} />
            <span>Open directly</span>
          </a>
        </div>
      );

    default:
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-background border border-border rounded-panel">
          <div className="bg-muted p-5 rounded-full text-muted-foreground mb-6">
            <FileIcon size={44} />
          </div>
          <h4 className="font-semibold text-foreground max-w-md truncate mb-1">
            {item.name}
          </h4>
          <p className="text-xs text-muted-foreground font-semibold mb-6">
            {item.mimeType} • {formatBytes(item.sizeBytes)}
          </p>
          <p className="text-xs text-muted-foreground font-semibold mb-6 max-w-sm">
            No preview available for this file type
          </p>
          <Button variant="default"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-control hover:opacity-90 px-5 py-3 text-xs font-semibold cursor-pointer transition-opacity"
          >
            <Download size={14} />
            <span>Download to device</span>
          </Button>
        </div>
      );
  }
});

interface PreviewIconProps {
  previewType: PreviewFileType;
}

export const PreviewIcon = React.memo(function PreviewIcon({
  previewType,
}: PreviewIconProps) {
  switch (previewType) {
    case PreviewFileType.IMAGE:
      return <ImageIcon size={22} className="text-info-content" />;
    case PreviewFileType.VIDEO:
      return <Video size={22} className="text-info-content" />;
    case PreviewFileType.AUDIO:
      return <Music size={22} className="text-success-content" />;
    case PreviewFileType.PDF:
      return <FileText size={22} className="text-destructive-content" />;
    default:
      return <FileIcon size={22} className="text-muted-foreground" />;
  }
});
