import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Archive,
  Code2,
  Download,
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
} from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { saveAs } from "file-saver";
import { formatFileSize } from "@/lib/file";
import { getConversationMedia } from "../../api/chat.api";
import MediaLightbox from "../message/media-lightbox";

const FILE_FILTERS = [
  { value: undefined, label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Docs" },
  { value: "spreadsheet", label: "Sheets" },
  { value: "presentation", label: "Slides" },
  { value: "archive", label: "Archives" },
  { value: "code", label: "Code" },
  { value: "other", label: "Other" },
] as const;

type FileFilter = (typeof FILE_FILTERS)[number]["value"];

interface MediaDetailViewProps {
  conversationId: string;
  onBack: () => void;
}

function getMediaKind(item: any) {
  const mimeType = item.mimeType || "";
  const name = (item.name || "").toLowerCase();

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    mimeType.includes("opendocument.text") ||
    [".doc", ".docx", ".txt"].some((ext) => name.endsWith(ext))
  ) {
    return "document";
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv" ||
    [".xls", ".xlsx", ".csv"].some((ext) => name.endsWith(ext))
  ) {
    return "spreadsheet";
  }
  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    [".ppt", ".pptx"].some((ext) => name.endsWith(ext))
  ) {
    return "presentation";
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("tar") ||
    [".zip", ".rar", ".7z", ".tar", ".gz"].some((ext) => name.endsWith(ext))
  ) {
    return "archive";
  }
  if (
    mimeType.startsWith("text/") ||
    [".js", ".ts", ".tsx", ".jsx", ".json", ".css", ".html", ".java", ".py"].some((ext) =>
      name.endsWith(ext),
    )
  ) {
    return "code";
  }
  return "other";
}

function getFileIcon(item: any) {
  const kind = getMediaKind(item);
  const className = "text-white";

  if (kind === "image") return <FileImage size={20} className={className} />;
  if (kind === "video") return <FileVideo size={20} className={className} />;
  if (kind === "audio") return <FileAudio size={20} className={className} />;
  if (kind === "spreadsheet") return <FileSpreadsheet size={20} className={className} />;
  if (kind === "presentation") return <Presentation size={20} className={className} />;
  if (kind === "archive") return <Archive size={20} className={className} />;
  if (kind === "code") return <Code2 size={20} className={className} />;
  if (kind === "pdf" || kind === "document") return <FileText size={20} className={className} />;
  return <File size={20} className={className} />;
}

function getFileIconBg(item: any) {
  const kind = getMediaKind(item);
  if (kind === "image") return "bg-emerald-500";
  if (kind === "video") return "bg-violet-500";
  if (kind === "audio") return "bg-pink-500";
  if (kind === "pdf") return "bg-red-500";
  if (kind === "spreadsheet") return "bg-green-600";
  if (kind === "presentation") return "bg-orange-500";
  if (kind === "archive") return "bg-amber-600";
  if (kind === "code") return "bg-slate-700";
  return "bg-blue-500";
}

function formatMediaDate(item: any) {
  const rawDate = item.message?.createdAt || item.createdAt;
  if (!rawDate) return "";
  return new Date(rawDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MediaDetailView({
  conversationId,
  onBack,
}: MediaDetailViewProps) {
  const [activeFilter, setActiveFilter] = useState<FileFilter>(undefined);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const { ref: loadMoreRef, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["media", conversationId, activeFilter],
      queryFn: async ({ pageParam }) => {
        const res = await getConversationMedia(
          conversationId,
          pageParam as string | undefined,
          20,
          activeFilter,
        );
        return res.data;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
      enabled: !!conversationId,
    });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.medias || []);
  }, [data?.pages]);

  const previewItems = useMemo(
    () => allItems.filter((item: any) => ["image", "video"].includes(getMediaKind(item))),
    [allItems],
  );

  const openItem = (item: any) => {
    const kind = getMediaKind(item);
    if (["image", "video"].includes(kind)) {
      const index = previewItems.findIndex((media: any) => media.id === item.id);
      setLightboxIndex(index >= 0 ? index : 0);
      return;
    }

    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

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
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3">
        <button
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-800">Files</h2>
      </div>

      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.value)}
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="text-center text-sm text-gray-400 py-4">Loading files...</div>
        ) : allItems.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">No files available</div>
        ) : (
          <div className="flex flex-col gap-2">
            {allItems.map((item: any) => {
              const kind = getMediaKind(item);

              return (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left transition hover:bg-gray-50"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                    {kind === "image" && item.fileUrl ? (
                      <img
                        src={item.fileUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : kind === "video" && item.fileUrl ? (
                      <video src={item.fileUrl} className="h-full w-full object-cover" />
                    ) : (
                      <span
                        className={`flex h-full w-full items-center justify-center ${getFileIconBg(item)}`}
                      >
                        {getFileIcon(item)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-gray-500">
                      {formatFileSize(item.sizeBytes)} - {formatMediaDate(item)}
                    </span>
                  </span>
                  {item.fileUrl && (
                    <span
                      onClick={(e) => handleDownload(e, item)}
                      className="rounded-md p-2 text-gray-400 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
                      title="Download"
                    >
                      <Download size={16} />
                    </span>
                  )}
                </button>
              );
            })}
            <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
              {isFetchingNextPage && (
                <span className="text-xs text-gray-400">Loading more...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {lightboxIndex >= 0 && previewItems.length > 0 && (
        <MediaLightbox
          medias={previewItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  );
}
