"use client";

import { Download, FileText, Play } from "lucide-react";
import Image from "next/image";
import { saveAs } from "file-saver";
import { formatFileSize } from "@/lib/file";
import { cn } from "@/lib/utils";
import type { MeetingMessageMediaResponse } from "../../../types/meeting.types";

function isVisualMedia(media: MeetingMessageMediaResponse) {
  return (
    media.type === "IMAGE" ||
    media.type === "VIDEO" ||
    media.mimeType.startsWith("image/") ||
    media.mimeType.startsWith("video/")
  );
}

async function downloadMedia(
  event: React.MouseEvent,
  media: MeetingMessageMediaResponse,
) {
  event.preventDefault();
  event.stopPropagation();

  const response = await fetch(media.fileUrl);
  const blob = await response.blob();
  saveAs(blob, media.name);
}

export function MeetingMessageAttachments({
  medias = [],
  isMe,
}: {
  medias?: MeetingMessageMediaResponse[];
  isMe: boolean;
}) {
  if (medias.length === 0) return null;

  const visualMedias = medias.filter(isVisualMedia);
  const fileMedias = medias.filter((media) => !isVisualMedia(media));

  return (
    <div className="flex max-w-full flex-col gap-2">
      {visualMedias.length > 0 && (
        <div
          className={cn(
            "grid max-w-full gap-1.5 overflow-hidden rounded-xl",
            visualMedias.length === 1 && "grid-cols-1",
            visualMedias.length === 2 && "grid-cols-2",
            visualMedias.length >= 3 && "grid-cols-3",
          )}
        >
          {visualMedias.map((media) =>
            media.mimeType.startsWith("image/") || media.type === "IMAGE" ? (
              <a
                key={media.id}
                href={media.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden bg-black/20"
              >
                <Image
                  src={media.fileUrl}
                  alt={media.name}
                  width={320}
                  height={220}
                  unoptimized
                  className={cn(
                    "w-full object-cover transition hover:scale-[1.02]",
                    visualMedias.length === 1
                      ? "max-h-56"
                      : "aspect-square h-full",
                  )}
                />
              </a>
            ) : (
              <a
                key={media.id}
                href={media.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden bg-black/30"
              >
                <video
                  src={media.fileUrl}
                  className={cn(
                    "w-full object-cover",
                    visualMedias.length === 1
                      ? "max-h-56"
                      : "aspect-square h-full",
                  )}
                />
                <span className="absolute inset-0 grid place-items-center bg-black/25 transition group-hover:bg-black/40">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white">
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  </span>
                </span>
              </a>
            ),
          )}
        </div>
      )}

      {fileMedias.map((media) => (
        <div
          key={media.id}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
            isMe
              ? "border-sky-300/30 bg-sky-200/15 text-sky-50"
              : "border-white/10 bg-white/8 text-slate-100",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{media.name}</div>
              <div className="text-[11px] font-semibold text-slate-400">
                {formatFileSize(media.sizeBytes)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => void downloadMedia(event, media)}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg transition hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
