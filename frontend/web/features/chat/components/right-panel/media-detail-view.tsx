import React, { useMemo } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Download,
} from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { getConversationMedia } from "../../api/chat.api";
import { saveAs } from "file-saver";
import MediaLightbox from "../media-lightbox";

interface MediaDetailViewProps {
  conversationId: string;
  type: "images" | "files" | "polls" | "notes" | "tasks";
  onBack: () => void;
}

export default function MediaDetailView({
  conversationId,
  type,
  onBack,
}: MediaDetailViewProps) {
  const [lightboxIndex, setLightboxIndex] = React.useState<number>(-1);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["media", conversationId, type],
      queryFn: async ({ pageParam }) => {
        const res = await getConversationMedia(
          conversationId,
          pageParam as string | undefined,
          20,
        );
        return res.data;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
    });

  const { ref: loadMoreRef, inView } = useInView();

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    const items = data.pages.flatMap((p) => p.medias || []);
    if (type === "images") {
      return items.filter(
        (m: any) =>
          m.mimeType?.startsWith("image/") || m.mimeType?.startsWith("video/"),
      );
    } else {
      return items.filter(
        (m: any) =>
          !m.mimeType?.startsWith("image/") &&
          !m.mimeType?.startsWith("video/"),
      );
    }
  }, [data?.pages, type]);

  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, name);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-800">
          {type === "images" ? "Hình ảnh & Video" : "Tài liệu"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-sm text-gray-400 py-4">
            Đang tải...
          </div>
        ) : allItems.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            Không có dữ liệu
          </div>
        ) : (
          <>
            {type === "images" ? (
              <div className="grid grid-cols-3 gap-2">
                {allItems.map((item, idx) => {
                  const isVideo = item.mimeType?.startsWith("video/");
                  return (
                    <div
                      key={item.id || idx}
                      className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden relative group cursor-pointer"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      {item.fileUrl ? (
                        isVideo ? (
                          <video
                            src={item.fileUrl}
                            className="w-full h-full object-cover"
                            controls={false}
                          />
                        ) : (
                          <img
                            src={item.fileUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-300">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {allItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition border-2 border-gray-200"
                  >
                    <div className="w-10 h-10 bg-blue-500 text-white rounded flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {item.sizeBytes
                          ? (item.sizeBytes / 1024).toFixed(2)
                          : "0"}{" "}
                        KB
                      </p>
                    </div>
                    {item.fileUrl && (
                      <button
                        onClick={(e) =>
                          handleDownload(e, item.fileUrl, item.name)
                        }
                        className="cursor-pointer p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-100 rounded transition"
                      >
                        <Download size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {hasNextPage && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isFetchingNextPage && (
                  <span className="text-xs text-gray-400">
                    Đang tải thêm...
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {lightboxIndex >= 0 && (
        <MediaLightbox
          medias={allItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  );
}
