import React from "react";
import { Image as ImageIcon, FileText, Video, BarChart2 } from "lucide-react";
import { UserProfileResponse } from "../types/chat.types";

interface MessageSnippetProps {
  latestMessage: any;
  currentUserId: string | null;
  isDirect: boolean;
  memberProfiles: Record<string, UserProfileResponse>;
}

const MessageSnippet = React.memo(function MessageSnippet({
  latestMessage,
  currentUserId,
  isDirect,
  memberProfiles,
}: MessageSnippetProps) {
  if (!latestMessage) {
    return (
      <p className="text-sm text-gray-500 truncate">
        {isDirect ? "Bắt đầu nhắn tin ngay..." : "Nhóm trò chuyện"}
      </p>
    );
  }

  if (latestMessage.type === "SYSTEM") {
    return (
      <p className="text-sm text-gray-500 truncate italic">
        {latestMessage.content}
      </p>
    );
  }

  const isMe = latestMessage.senderId === currentUserId;
  let prefix = "";

  if (isMe) {
    prefix = "Bạn: ";
  } else if (!isDirect && latestMessage.senderId) {
    const profile = memberProfiles[latestMessage.senderId];
    const fullName = profile?.fullName || "User";
    prefix = `${fullName}: `;
  }

  if (latestMessage.type === "POLL") {
    return (
      <p className="text-sm text-gray-500 truncate flex items-center gap-1">
        {prefix}
        <BarChart2 size={14} className="inline-block" />
        <span>Bình chọn {latestMessage.poll.title}</span>
      </p>
    );
  }

  if (latestMessage.type === "NOTE") {
    return (
      <p className="text-sm text-gray-500 truncate flex items-center gap-1">
        {prefix}
        <FileText size={14} className="inline-block" />
        <span>Đã tạo ghi chú</span>
      </p>
    );
  }

  const hasText =
    latestMessage.content && latestMessage.content.trim().length > 0;

  if (hasText) {
    return (
      <p className="text-sm text-gray-500 truncate">
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
        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
          {prefix}
          <ImageIcon size={14} className="inline-block" />
          <span>Đã gửi hình ảnh</span>
        </p>
      );
    }

    if (isVideo) {
      return (
        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
          {prefix}
          <Video size={14} className="inline-block" />
          <span>Đã gửi video</span>
        </p>
      );
    }
  }

  return (
    <p className="text-sm text-gray-500 truncate flex items-center gap-1">
      {prefix}
      <FileText size={14} className="inline-block" />
      <span>Đã gửi tệp</span>
    </p>
  );
});

export default MessageSnippet;
