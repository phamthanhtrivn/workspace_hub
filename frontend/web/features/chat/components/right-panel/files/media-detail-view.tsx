import { toast } from "sonner";

import { IconButton } from "@/components/ui/icon-button";
import { QueryFeedback } from "@/components/common/query-feedback";
import React, { useMemo, useState, useEffect } from "react";
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
  Search,
} from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { saveAs } from "file-saver";
import { formatDateTime } from "@/lib/date";
import { formatFileSize } from "@/lib/file";
import { logApiError } from "@/lib/interceptors";
import { getDirectConversationMedia } from "@/features/chat/api/direct-message.api";
import { getChannelMedia } from "@/features/chat/api/channel.api";
import MediaLightbox from "../../message/media-lightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { LoadingState } from "@/components/ui/loading-state";


const FILE_FILTERS = [
  { value: undefined, label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Documents" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "presentation", label: "Presentations" },
  { value: "archive", label: "Archives" },
  { value: "code", label: "Code" },
  { value: "other", label: "Other" },
] as const;

type FileFilter = (typeof FILE_FILTERS)[number]["value"];

interface MediaDetailViewProps {
  conversationId: string;
  isDirect?: boolean;
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
    [
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".json",
      ".css",
      ".html",
      ".java",
      ".py",
    ].some((ext) => name.endsWith(ext))
  ) {
    return "code";
  }
  return "other";
}

function getFileIcon(item: any) {
  const kind = getMediaKind(item);
  const className = "text-inherit";

  if (kind === "image") return <FileImage size={20} className={className} />;
  if (kind === "video") return <FileVideo size={20} className={className} />;
  if (kind === "audio") return <FileAudio size={20} className={className} />;
  if (kind === "spreadsheet")
    return <FileSpreadsheet size={20} className={className} />;
  if (kind === "presentation")
    return <Presentation size={20} className={className} />;
  if (kind === "archive") return <Archive size={20} className={className} />;
  if (kind === "code") return <Code2 size={20} className={className} />;
  if (kind === "pdf" || kind === "document")
    return <FileText size={20} className={className} />;
  return <File size={20} className={className} />;
}

function getFileIconBg(item: any) {
  const kind = getMediaKind(item);
  if (kind === "image") return "bg-success text-success-foreground";
  if (kind === "video") return "bg-primary text-primary-foreground";
  if (kind === "audio") return "bg-primary text-primary-foreground";
  if (kind === "pdf") return "bg-destructive text-destructive-foreground";
  if (kind === "spreadsheet") return "bg-success text-success-foreground";
  if (kind === "presentation") return "bg-warning text-warning-foreground";
  if (kind === "archive") return "bg-warning text-warning-foreground";
  if (kind === "code") return "bg-primary text-primary-foreground";
  return "bg-primary text-primary-foreground";
}

function formatMediaDate(item: any) {
  return formatDateTime(item.message?.createdAt || item.createdAt);
}

export default function MediaDetailView({
  conversationId,
  isDirect = false,
  onBack,
}: MediaDetailViewProps) {
  const [activeFilter, setActiveFilter] = useState<FileFilter>(undefined);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { ref: loadMoreRef, inView } = useInView();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, isFetching, refetch } =
    useInfiniteQuery({
      queryKey: [
        "media",
        isDirect ? "direct" : "channel",
        conversationId,
        activeFilter,
        debouncedSearchQuery,
      ],
      queryFn: async ({ pageParam }) => {
        try {
          const fetchMedia = isDirect
            ? getDirectConversationMedia
            : getChannelMedia;
          const res = await fetchMedia(
            conversationId,
            pageParam as string | undefined,
            20,
            activeFilter,
            debouncedSearchQuery,
          );
          return res.data;
        } catch (error) {
          logApiError(
            error,
            isDirect
              ? "Failed to fetch direct message media detail"
              : "Failed to fetch channel media detail",
          );
          throw error;
        }
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
      enabled: !!conversationId,
      retry: false,
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
    () =>
      allItems.filter((item: any) =>
        ["image", "video"].includes(getMediaKind(item)),
      ),
    [allItems],
  );

  const openItem = (item: any) => {
    const kind = getMediaKind(item);
    if (["image", "video"].includes(kind)) {
      const index = previewItems.findIndex(
        (media: any) => media.id === item.id,
      );
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
      toast.error("Could not download this file. Please try again.");
    }
  };

  return (
    <div className="w-full h-full min-h-0 min-w-0 flex flex-col bg-card">
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center gap-3">
        <Button variant="unstyled" aria-label="Back"
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="font-semibold text-foreground">
          Files
        </h2>
      </div>

      <div className="border-b border-border px-4 py-3 flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input aria-label="Search files by name" unstyled
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted border border-transparent rounded-control focus:bg-card focus:border-info-outline focus:ring-1 focus:ring-ring outline-none transition"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            File Type
          </label>
          <CustomSelect
            ariaLabel="File filter"
            value={activeFilter || ""}
            onChange={nextValue =>
              setActiveFilter((nextValue || undefined) as FileFilter)
            }
            triggerClassName="w-full cursor-pointer rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium text-foreground outline-none transition focus:border-info-outline focus:ring-1 focus:ring-ring"
          >
            {FILE_FILTERS.map((filter) => (
              <option key={filter.label} value={filter.value || ""}>
                {filter.label}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isError && allItems.length > 0 && <QueryFeedback label="conversation files" error retrying={isFetching} onRetry={() => refetch()} />}
        {isError && allItems.length === 0 ? <QueryFeedback label="conversation files" error retrying={isFetching} onRetry={() => refetch()} /> : isLoading ? (
          <LoadingState label="Loading files..." layout="centered" className="text-center text-sm text-muted-foreground py-4" />
        ) : allItems.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No files available
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {allItems.map((item: any) => {
              const kind = getMediaKind(item);

              return (
                <div
                  key={item.id}

                  className="group flex w-full cursor-pointer items-center gap-3 rounded-control border border-border bg-card p-2 text-left transition hover:bg-background"
                >
                  <Button variant="unstyled" type="button" onClick={() => openItem(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                    {kind === "image" && item.fileUrl ? (
                      <img
                        src={item.fileUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : kind === "video" && item.fileUrl ? (
                      <video
                        src={item.fileUrl}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className={`flex h-full w-full items-center justify-center ${getFileIconBg(item)}`}
                      >
                        {getFileIcon(item)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {formatFileSize(item.sizeBytes)} - {formatMediaDate(item)}
                    </span>
                  </span>
                  </Button>{item.fileUrl && (
                    <IconButton label="Download file" showTooltip={false} size="icon-sm" type="button" aria-label="Download file"
                      onClick={(e) => handleDownload(e, item)}
                      className="rounded-md p-2 text-muted-foreground opacity-0 transition hover:bg-info-soft hover:text-info-content group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                      title="Download"
                    >
                      <Download size={16} />
                    </IconButton>
                  )}
                </div>
              );
            })}
            <div
              ref={loadMoreRef}
              className="h-8 flex items-center justify-center"
            >
              {isFetchingNextPage && (
                <LoadingState label="Loading more..." className="text-xs text-muted-foreground" />
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
