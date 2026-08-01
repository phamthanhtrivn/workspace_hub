"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { DocumentItem } from "../types/documents.types";
import { PreviewFileType } from "../types/documents.enums";
import { getPreviewFileType, formatBytes } from "../utils/documents.utils";
import { MAX_TEXT_PREVIEW_SIZE } from "../types/documents.constants";
import { PreviewContent, PreviewIcon } from "./preview-content";
import { X, Download } from "lucide-react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DocumentItem | null;
}

function FilePreviewModal({ isOpen, onClose, item }: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const { data: previewUrl, isLoading: isUrlLoading, error } = useQuery({
    queryKey: ["document-preview", item?.id],
    queryFn: () => (item ? documentsApi.getPreviewUrl(item.id) : Promise.reject("No item")),
    enabled: isOpen && !!item && item.type !== "FOLDER",
    staleTime: 5 * 60 * 1000, // 5 mins cache
  });

  const previewType = useMemo(() => {
    if (!item) return PreviewFileType.UNKNOWN;
    return getPreviewFileType(item.mimeType, item.name);
  }, [item]);

  const isText = previewType === PreviewFileType.TEXT;

  // Fetch text file content directly from S3 temporary URL
  useEffect(() => {
    if (isOpen && isText && previewUrl) {
      setLoadingText(true);
      setTextContent(null);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load text content");
          return res.text();
        })
        .then((text) => {
          if (text.length > MAX_TEXT_PREVIEW_SIZE) {
            setTextContent(text.slice(0, MAX_TEXT_PREVIEW_SIZE) + "\n\n... [Nội dung quá dài, vui lòng tải xuống để xem toàn bộ] ...");
          } else {
            setTextContent(text);
          }
        })
        .catch((err) => {
          console.error(err);
          setTextContent("Không thể tải nội dung tệp văn bản này.");
        })
        .finally(() => {
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
    }
  }, [isOpen, isText, previewUrl]);

  const handleDownload = useCallback(async () => {
    if (item) {
      try {
        const downloadUrl = await documentsApi.getDownloadUrl(item.id);
        const link = document.createElement("a");
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Failed to generate download URL", err);
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const isImageOrVideo = previewType === PreviewFileType.IMAGE || previewType === PreviewFileType.VIDEO;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={
          isImageOrVideo
            ? "bg-white rounded-3xl w-full flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-w-3xl"
            : "bg-white rounded-3xl w-full flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-w-4xl"
        }
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-50 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-slate-50 rounded-xl shrink-0">
              <PreviewIcon previewType={previewType} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 truncate max-w-lg leading-tight">
                {item.name}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5 leading-none">
                Dung lượng: {formatBytes(item.sizeBytes)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {previewUrl && (
              <button
                onClick={handleDownload}
                title="Tải xuống"
                className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-slate-100"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              title="Đóng"
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 overflow-auto max-h-[78vh] flex-1 bg-white">
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
      </div>
    </div>
  );
}

export default React.memo(FilePreviewModal);
