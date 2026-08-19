import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  File,
  FileImage,
  FileText,
  FileVideo,
} from "lucide-react";
import { saveAs } from "file-saver";
import { formatFileSize } from "@/lib/file";
import { formatDateTime } from "@/lib/date";
import SeeAllButton from "../see-all-button";

interface FilesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  files: any[];
  onSeeAll?: () => void;
  onOpenPreview?: (mediaId: string) => void;
}

function isVisualFile(item: any) {
  return (
    item.mimeType?.startsWith("image/") || item.mimeType?.startsWith("video/")
  );
}

function FileThumb({ item }: { item: any }) {
  if (item.mimeType?.startsWith("image/") && item.fileUrl) {
    return (
      <img
        src={item.fileUrl}
        alt={item.name}
        className="h-full w-full object-cover"
      />
    );
  }

  if (item.mimeType?.startsWith("video/") && item.fileUrl) {
    return <video src={item.fileUrl} className="h-full w-full object-cover" />;
  }

  const Icon = item.mimeType?.startsWith("image/")
    ? FileImage
    : item.mimeType?.startsWith("video/")
      ? FileVideo
      : item.mimeType === "application/pdf"
        ? FileText
        : File;

  return (
    <span className="flex h-full w-full items-center justify-center bg-blue-500 text-white">
      <Icon size={18} />
    </span>
  );
}

export default function FilesSection({
  isExpanded,
  onToggle,
  files,
  onSeeAll,
  onOpenPreview,
}: FilesSectionProps) {
  const displayItems = files.slice(0, 5);
  const hasMore = files.length > 5;

  const handleDownload = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(item.fileUrl);
      const blob = await response.blob();
      saveAs(blob, item.name);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <FileText size={18} className="text-gray-500" />
          Files
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {files.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              No files available
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {displayItems.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    onClick={() => {
                      if (isVisualFile(item)) {
                        onOpenPreview?.(item.id);
                        return;
                      }
                      if (item.fileUrl) {
                        window.open(
                          item.fileUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-2 text-left transition hover:bg-gray-50"
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      <FileThumb item={item} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {formatFileSize(item.sizeBytes)} -{" "}
                        {formatDateTime(
                          item.message?.createdAt || item.createdAt,
                        )}
                      </span>
                    </span>
                    {item.fileUrl && (
                      <span
                        onClick={(e) => handleDownload(e, item)}
                        className="rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
                        title="Download"
                      >
                        <Download size={15} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {hasMore && (
                <SeeAllButton onClick={onSeeAll}>See all files</SeeAllButton>
              )}
            </>
          )}
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1" />
    </div>
  );
}
