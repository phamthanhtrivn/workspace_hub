import React from "react";
import { Image as ImageIcon, FileText, Video } from "lucide-react";
import { UserProfileResponse } from "../types/chat.types";

interface MessageSnippetProps {
  latestMessage: any;
  currentUserId: string | null;
  isDirect: boolean;
  memberProfiles: Record<string, UserProfileResponse>;
}

export default function MessageSnippet({
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

  return (
    <p className="text-sm text-gray-500 truncate flex items-center gap-1">
      {prefix}
      <FileText size={14} className="inline-block" />
      <span>Đã gửi tệp</span>
    </p>
  );
}
