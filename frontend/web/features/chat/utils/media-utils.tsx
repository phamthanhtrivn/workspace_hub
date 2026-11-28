import { VoiceMessagePlayer } from "../components/message/voice-message-player";
import type { VoiceChatType } from "../types/voice.types";
import { formatDateTime } from "@/lib/date";
import type { ChatMediaResponse } from "../types/chat.types";

export const isAudioFile = (
  media: ChatMediaResponse | null | undefined,
): boolean => {
  if (!media) return false;
  if (media.mimeType?.startsWith("audio/")) return true;
  const name = media.name?.toLowerCase() ?? "";
  if (name.startsWith("voice_message_") && /\.(webm|m4a|ogg|wav)$/.test(name))
    return true;
  if (media.mimeType && media.mimeType !== "application/octet-stream")
    return false;
  return /\.(mp3|m4a|wav|ogg|flac|aac)$/.test(name);
};

export const renderAudioPlayer = (
  media: ChatMediaResponse,
  isMe: boolean,
  chatType?: VoiceChatType,
) => {
  return (
    <VoiceMessagePlayer
      key={media.id}
      media={media}
      isMe={isMe}
      chatType={chatType}
    />
  );
};

export function formatDate(createdAt: string) {
  return formatDateTime(createdAt);
}
