import React from "react";
import {
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";

interface ImagesVideosSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  imagesAndVideos: any[];
  onOpenLightbox: (index: number) => void;
}

export default function ImagesVideosSection({
  isExpanded,
  onToggle,
  imagesAndVideos,
  onOpenLightbox,
}: ImagesVideosSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <ImageIcon size={18} className="text-gray-500" />
          Hình ảnh & Video
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {imagesAndVideos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              Chưa có hình ảnh/video nào
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {imagesAndVideos.map((item, idx) => {
                const isVideo = item.mimeType?.startsWith("video/");

                return (
                  <div
                    key={item.id || idx}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
                    onClick={() => onOpenLightbox(idx)}
                  >
                    {item.fileUrl ? (
                      isVideo ? (
                        <>
                          <video
                            src={item.fileUrl}
                            className="w-full h-full object-cover"
                            controls={false}
                          />
                        </>
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] truncate max-w-full px-1"></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>
    </div>
  );
}
