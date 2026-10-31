import { formatDateTime } from "@/lib/date";
import type { ChatMediaResponse } from "../types/chat.types";

export const isAudioFile = (media: ChatMediaResponse | null | undefined): boolean => {
  if (!media) return false;
  return (
    media.mimeType?.startsWith("audio/") ||
    media.name?.endsWith(".webm") ||
    media.name?.endsWith(".mp3") ||
    media.name?.endsWith(".m4a")
  );
};

export const renderAudioPlayer = (media: ChatMediaResponse, isMe: boolean) => {
  return (
    <div
      key={media.id}
      className={`p-2 rounded-panel ${isMe ? "bg-primary-soft" : "bg-muted"}`}
    >
      <audio controls src={media.fileUrl} className="h-10 max-w-[240px]" />
    </div>
  );
};

export function formatDate(createdAt: string) {
  return formatDateTime(createdAt);
}
