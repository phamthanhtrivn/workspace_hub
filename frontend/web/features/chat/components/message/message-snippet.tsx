import React from "react";
import { Image as ImageIcon, FileText, Video, BarChart2 } from "lucide-react";
import { UserProfileResponse } from "../../types/chat.types";
import { formatMessageContent } from "../../utils/message-formatter";

interface MessageSnippetProps {
  latestMessage: any;
  currentUserId: string | null;
  isDirect: boolean;
  memberProfiles: Record<string, UserProfileResponse>;
  isUnread?: boolean;
}

const MessageSnippet = React.memo(function MessageSnippet({
  latestMessage,
  currentUserId,
  isDirect,
  memberProfiles,
  isUnread = false,
}: MessageSnippetProps) {
  const textClass = isUnread ? "text-gray-900 font-semibold" : "text-gray-500";
  if (!latestMessage) {
    return (
      <p className={`text-sm truncate ${textClass}`}>
        {isDirect ? "Start messaging..." : "Group Chat"}
      </p>
    );
  }

  if (latestMessage.type === "SYSTEM") {
    return (
      <p className={`text-sm truncate ${textClass}`}>{latestMessage.content}</p>
    );
  }

  const isMe = latestMessage.senderId === currentUserId;
  let prefix = "";

  if (isMe) {
    prefix = "You: ";
  } else if (!isDirect && latestMessage.senderId) {
    const profile = memberProfiles[latestMessage.senderId];
    const fullName = profile?.fullName || "User";
    prefix = `${fullName}: `;
  }

  if (latestMessage.recalled) {
    return (
      <p className={`text-sm truncate ${textClass}`}>
        {prefix}Message recalled
      </p>
    );
  }

  if (latestMessage.type === "POLL") {
    return (
      <p className={`text-sm truncate flex items-center gap-1 ${textClass}`}>
        {prefix}
        <BarChart2 size={14} className="inline-block" />
        <span>Poll: {latestMessage.poll.title}</span>
      </p>
    );
  }

  if (latestMessage.type === "NOTE") {
    return (
      <p className={`text-sm truncate flex items-center gap-1 ${textClass}`}>
        {prefix}
        <FileText size={14} className="inline-block" />
        <span>Created a note</span>
      </p>
    );
  }

  const hasText =
    latestMessage.content && latestMessage.content.trim().length > 0;

  if (hasText) {
    return (
      <p className={`text-sm truncate ${textClass}`}>
        {prefix}
        {latestMessage.content}
      </p>
    );
  }

  const medias = latestMessage.medias || [];
  if (medias.length > 0) {
    const firstMedia = medias[0];
    const mimeType = firstMedia.mimeType || "";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    if (isImage) {
      return (
        <p className={`text-sm truncate flex items-center gap-1 ${textClass}`}>
          {prefix}
          <ImageIcon size={14} className="inline-block" />
          <span>Sent an image</span>
        </p>
      );
    }

    if (isVideo) {
      return (
        <p className={`text-sm truncate flex items-center gap-1 ${textClass}`}>
          {prefix}
          <Video size={14} className="inline-block" />
          <span>Sent a video</span>
        </p>
      );
    }
  }

  return (
    <p className={`text-sm truncate flex items-center gap-1 ${textClass}`}>
      {prefix}
      <FileText size={14} className="inline-block" />
      <span>Sent a file</span>
    </p>
  );
});

export default MessageSnippet;
