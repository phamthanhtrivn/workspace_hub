"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { DocumentItem } from "../../types/documents.types";
import { PreviewFileType } from "../../types/documents.enums";
import { getPreviewFileType, formatBytes } from "../../utils/documents.utils";
import { MAX_TEXT_PREVIEW_SIZE } from "../../types/documents.constants";
import { PreviewContent, PreviewIcon } from "./preview-content";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentsIconButton } from "../ui/documents-icon-button";

interface FilePreviewModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  versionId?: string;
  onDownload?: (item: DocumentItem) => void;
  onOpenDetails?: (item: DocumentItem) => void;
}

export function FilePreviewModal({
  open,
  isOpen,
  onClose,
  item,
  versionId,
  onDownload,
}: FilePreviewModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const {
    data: previewUrl,
    isLoading: isUrlLoading,
    error,
  } = useQuery({
    queryKey: ["document-preview", item?.id, versionId],
    queryFn: () =>
      item
        ? documentsApi.getPreviewUrl(item.id, versionId)
        : Promise.reject("No item"),
    enabled: isModalOpen && !!item && item.type !== "FOLDER",
    staleTime: 5 * 60 * 1000,
  });

  const previewType = useMemo(() => {
    if (!item) return PreviewFileType.UNKNOWN;
    return getPreviewFileType(item.mimeType, item.name);
  }, [item]);

  const isText = previewType === PreviewFileType.TEXT;

  useEffect(() => {
    if (isModalOpen && isText && previewUrl) {
      setLoadingText(true);
      setTextContent(null);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load text content");
          return res.text();
        })
        .then((text) => {
          if (text.length > MAX_TEXT_PREVIEW_SIZE) {
            setTextContent(
              text.slice(0, MAX_TEXT_PREVIEW_SIZE) +
                "\n\n... [Content too long, please download to view full file] ..."
            );
          } else {
            setTextContent(text);
          }
        })
        .catch((err) => {
          console.error(err);
          setTextContent("Could not load text file content.");
        })
        .finally(() => {
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
    }
  }, [isModalOpen, isText, previewUrl]);

  const handleDownload = useCallback(async () => {
    if (onDownload && item) {
      onDownload(item);
      return;
    }
    if (item) {
      try {
        const downloadUrl = await documentsApi.getDownloadUrl(
          item.id,
          versionId
        );
        const link = document.createElement("a");
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Failed to generate download URL", err);
      }
    }
  }, [item, versionId, onDownload]);

  if (!isModalOpen || !item) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-4xl border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-3xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 text-left pr-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-50 text-blue-600 border border-slate-100">
              <PreviewIcon previewType={previewType} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-black text-slate-800 truncate max-w-lg">
                {item.name}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-slate-400 font-bold">
                {formatBytes(item.sizeBytes)}
              </p>
            </div>
          </div>
          {previewUrl ? (
            <DocumentsIconButton
              icon={Download}
              label="Download"
              onClick={handleDownload}
            />
          ) : null}
        </DialogHeader>

        <div className="mt-4 max-h-[75vh] overflow-auto rounded-2xl bg-slate-50/50 p-4 border border-slate-100">
          <PreviewContent
            item={item}
            previewType={previewType}
            previewUrl={previewUrl}
            textContent={textContent}
            isUrlLoading={isUrlLoading}
            loadingText={loadingText}
            error={error}
            handleDownload={handleDownload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(FilePreviewModal);
