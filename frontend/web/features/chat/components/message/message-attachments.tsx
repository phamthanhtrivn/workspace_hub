import { Download, FileText, Play } from "lucide-react";
import Image from "next/image";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/file";
import { isAudioFile, renderAudioPlayer } from "../../utils/media-utils";
import { MessageMedia } from "./chat-message.types";

interface MessageVisualMediasProps {
  medias: MessageMedia[];
  onPreview: (index: number) => void;
}

interface MessageFileMediasProps {
  medias: MessageMedia[];
  isMe: boolean;
}

async function handleDownload(
  event: React.MouseEvent,
  url: string,
  name: string,
) {
  event.preventDefault();
  event.stopPropagation();

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    saveAs(blob, name);
  } catch (error) {
    console.error("Download error:", error);
  }
}

export function MessageVisualMedias({
  medias,
  onPreview,
}: MessageVisualMediasProps) {
  if (medias.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-1.5 w-full max-w-full rounded-2xl overflow-hidden",
        medias.length === 1 && "grid-cols-1 sm:max-w-sm",
        medias.length === 2 && "grid-cols-2 sm:max-w-xs sm:max-w-sm md:max-w-md",
        medias.length >= 3 && "grid-cols-3 sm:max-w-xs sm:max-w-sm md:max-w-md",
      )}
    >
      {medias.map((media, mediaIndex) =>
        media.type === "IMAGE" ? (
          <button
            type="button"
            key={media.id}
            className="cursor-pointer overflow-hidden bg-black/5 hover:opacity-95 transition-opacity"
            onClick={() => onPreview(mediaIndex)}
          >
            <Image
              src={media.fileUrl}
              alt={media.name}
              width={600}
              height={400}
              unoptimized
              className={cn(
                "w-full transition duration-200 hover:scale-102",
                medias.length === 1
                  ? "max-h-[300px] object-contain"
                  : "aspect-square object-cover",
              )}
            />
          </button>
        ) : (
          <button
            type="button"
            key={media.id}
            className={cn(
              "relative w-full overflow-hidden bg-black/5 cursor-pointer group",
              medias.length !== 1 && "aspect-square",
            )}
            onClick={() => onPreview(mediaIndex)}
          >
            <video
              src={media.fileUrl}
              className={cn(
                "w-full",
                medias.length === 1
                  ? "max-h-[300px] object-contain bg-black"
                  : "h-full object-cover",
              )}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
              <span className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-lg">
                <Play size={20} className="ml-1" fill="currentColor" />
              </span>
            </span>
          </button>
        ),
      )}
    </div>
  );
}

export function MessageFileMedias({ medias, isMe }: MessageFileMediasProps) {
  if (medias.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 max-w-full">
      {medias.map((media) => {
        if (isAudioFile(media)) {
          return renderAudioPlayer(media, isMe);
        }

        return (
          <div
            key={media.id}
            className={cn(
              "flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl border transition shadow-sm",
              isMe
                ? "bg-[#DBEAFE]/80 border-blue-400/40 text-blue-900"
                : "bg-white border-slate-200/60 hover:bg-slate-50 text-slate-800",
            )}
          >
            <div className="flex gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  isMe
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-blue-600 shadow-sm",
                )}
              >
                <FileText size={20} />
              </div>
              <div className="flex flex-col min-w-0 max-w-[180px]">
                <span className="text-sm font-semibold truncate">
                  {media.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isMe ? "text-blue-700/80" : "text-slate-400",
                  )}
                >
                  {formatFileSize(media.sizeBytes)}
                </span>
              </div>
            </div>
            <Download
              onClick={(event) =>
                handleDownload(event, media.fileUrl, media.name)
              }
              size={16}
              className={cn(
                "ml-1 cursor-pointer transition p-1 rounded-lg",
                isMe
                  ? "text-blue-800 hover:bg-blue-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
