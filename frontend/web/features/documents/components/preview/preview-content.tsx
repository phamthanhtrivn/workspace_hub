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
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface PreviewContentProps {
  item: DocumentItem;
  previewType: PreviewFileType;
  previewUrl?: string;
  textContent: string | null;
  isUrlLoading: boolean;
  loadingText: boolean;
  error: any;
  handleDownload: () => void;
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
}: PreviewContentProps) {
  const intl = useAppIntl();

  if (isUrlLoading || (previewType === PreviewFileType.TEXT && loadingText)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 py-20">
        <Loader2
          className="animate-spin text-[var(--color-primary)]"
          size={36}
        />
        <span className="text-sm font-semibold">
          {intl.formatMessage({ id: "documents.loadingPreview" })}
        </span>
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 py-20">
        <div className="bg-red-50 p-4 rounded-full text-red-500">
          <X size={32} />
        </div>
        <div>
          <h4 className="font-black text-slate-800">
            {intl.formatMessage({ id: "documents.previewLoadFailed" })}
          </h4>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {intl.formatMessage({ id: "documents.previewErrorDescription" })}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] hover:opacity-90 px-4 py-2.5 text-xs font-black text-white shadow-xs cursor-pointer transition-opacity"
        >
          <Download size={14} />
          <span>{intl.formatMessage({ id: "documents.downloadFile" })}</span>
        </button>
      </div>
    );
  }

  switch (previewType) {
    case PreviewFileType.IMAGE:
      return (
        <div className="flex items-center justify-center w-full h-full max-h-[70vh] bg-slate-950/2 rounded-2xl p-2 overflow-hidden">
          <img
            src={previewUrl}
            alt={item.name}
            className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-md border border-slate-100/50"
          />
        </div>
      );

    case PreviewFileType.PDF:
      return (
        <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
          <iframe
            src={`${previewUrl}#toolbar=0`}
            className="w-full h-full border-0"
            title={item.name}
          />
        </div>
      );

    case PreviewFileType.VIDEO:
      return (
        <div className="flex items-center justify-center w-full bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-900">
          <video
            controls
            autoPlay
            className="w-full max-h-[70vh] outline-none"
            src={previewUrl}
          />
        </div>
      );

    case PreviewFileType.AUDIO:
      return (
        <div className="flex flex-col items-center justify-center w-full p-8 py-16 bg-gradient-to-br from-slate-50 to-teal-50/10 border border-slate-100 rounded-2xl shadow-xs">
          <div className="bg-teal-500/10 p-5 rounded-full text-teal-600 mb-6 animate-pulse">
            <Music size={48} />
          </div>
          <span className="block font-black text-slate-800 text-center mb-1 max-w-md truncate">
            {item.name}
          </span>
          <span className="block text-xs font-semibold text-slate-400 mb-6">
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
          <div className="w-full max-h-[70vh] bg-slate-50/50 border border-slate-100 rounded-2xl p-4 overflow-auto shadow-inner text-left">
            <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap break-all leading-relaxed">
              {textContent}
            </pre>
          </div>
        );
      }
      return null;

    case PreviewFileType.OFFICE:
      const officeViewerUrl = `${OFFICE_VIEWER_BASE_URL}?src=${encodeURIComponent(previewUrl)}`;
      return (
        <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner relative group">
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0"
            title={item.name}
          />
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/80 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-md hover:bg-slate-50 transition-all cursor-pointer animate-in fade-in"
          >
            <ExternalLink size={12} />
            <span>{intl.formatMessage({ id: "documents.openDirectly" })}</span>
          </a>
        </div>
      );

    default:
      // Default Fallback for Unknown files
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 py-16 bg-slate-50/50 border border-slate-100 rounded-2xl">
          <div className="bg-slate-100 p-5 rounded-full text-slate-500 mb-6">
            <FileIcon size={44} />
          </div>
          <h4 className="font-black text-slate-800 max-w-md truncate mb-1">
            {item.name}
          </h4>
          <p className="text-xs text-slate-400 font-semibold mb-6">
            {intl.formatMessage(
              { id: "documents.fileTypeAndSize" },
              { type: item.mimeType, size: formatBytes(item.sizeBytes) },
            )}
          </p>
          <p className="text-xs text-slate-500 font-bold mb-6 max-w-sm">
            {intl.formatMessage({ id: "documents.unsupportedPreview" })}
          </p>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] hover:opacity-90 px-5 py-3 text-xs font-black text-white shadow-xs cursor-pointer transition-opacity"
          >
            <Download size={14} />
            <span>{intl.formatMessage({ id: "documents.downloadToDevice" })}</span>
          </button>
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
      return <ImageIcon size={22} className="text-blue-500" />;
    case PreviewFileType.VIDEO:
      return <Video size={22} className="text-indigo-500" />;
    case PreviewFileType.AUDIO:
      return <Music size={22} className="text-teal-500" />;
    case PreviewFileType.PDF:
      return <FileText size={22} className="text-red-500" />;
    default:
      return <FileIcon size={22} className="text-slate-500" />;
  }
});
