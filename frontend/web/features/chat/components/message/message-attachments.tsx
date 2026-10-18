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
        "grid gap-1.5 w-full max-w-full rounded-panel overflow-hidden",
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
            className="cursor-pointer overflow-hidden bg-overlay/5 hover:opacity-95 transition-opacity"
            onClick={() => onPreview(mediaIndex)}
          >
            <Image
              src={media.fileUrl}
              alt={media.name}
              width={600}
              height={400}
              unoptimized
              className={cn(
                "w-full transition duration-200",
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
              "relative w-full overflow-hidden bg-overlay/5 cursor-pointer group",
              medias.length !== 1 && "aspect-square",
            )}
            onClick={() => onPreview(mediaIndex)}
          >
            <video
              src={media.fileUrl}
              className={cn(
                "w-full",
                medias.length === 1
                  ? "max-h-[300px] object-contain bg-overlay"
                  : "h-full object-cover",
              )}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-overlay/20 group-hover:bg-overlay/40 transition">
              <span className="w-10 h-10 bg-media-surface rounded-full flex items-center justify-center text-media-foreground">
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
              "flex items-center justify-between gap-3 py-2.5 px-4 rounded-panel border transition",
              isMe
                ? "bg-primary-soft/80 border-info-outline/40 text-info-content"
                : "bg-card border-border hover:bg-background text-foreground",
            )}
          >
            <div className="flex gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-info-content",
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
                    "text-xs font-medium",
                    isMe ? "text-info-content" : "text-muted-foreground",
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
                  ? "text-info-content hover:bg-info-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
