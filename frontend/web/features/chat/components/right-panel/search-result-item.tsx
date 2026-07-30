import React from "react";
import Image from "next/image";
import {
  User,
  Image as ImageIcon,
  FileText,
  Video,
  BarChart2,
} from "lucide-react";
import { UserProfileResponse } from "../../types/chat.types";
import { formatTimeAgo } from "@/lib/date";
import { formatMessageContent } from "../../utils/message-formatter";

interface SearchResultItemProps {
  message: any;
  currentUserId: string | null;
  memberProfiles: Record<string, UserProfileResponse>;
  isDirect: boolean;
  onClick: (messageId: string) => void;
}

export default function SearchResultItem({
  message,
  currentUserId,
  memberProfiles,
  isDirect,
  onClick,
}: SearchResultItemProps) {
  const profile = memberProfiles[message.senderId];
  const isMe = message.senderId === currentUserId;
  const fullName = isMe ? "Bạn" : profile?.fullName || "Người dùng";
  const avatarUrl = profile?.avatarUrl;

  const renderSnippet = () => {
    if (message.recalled) {
      return (
        <span className="italic text-gray-500">Tin nhắn đã bị thu hồi</span>
      );
    }
    if (message.type === "SYSTEM") {
      return <span className="italic text-gray-500">{message.content}</span>;
    }
    if (message.type === "POLL") {
      return (
        <span className="flex items-center gap-1">
          <BarChart2 size={14} className="inline-block" />
          <span>Bình chọn {message.poll?.title}</span>
        </span>
      );
    }
    if (message.type === "NOTE") {
      return (
        <span className="flex items-center gap-1">
          <FileText size={14} className="inline-block" />
          <span>Đã tạo ghi chú</span>
        </span>
      );
    }

    const hasText = message.content && message.content.trim().length > 0;
    if (hasText) {
      return formatMessageContent(message.content, memberProfiles);
    }

    const medias = message.medias || [];
    if (medias.length > 0) {
      const firstMedia = medias[0];
      const mimeType = firstMedia.mimeType || "";
      const fileName = firstMedia.name || "";
      
      if (mimeType.startsWith("image/")) {
        return (
          <span className="flex items-center gap-1">
            <ImageIcon size={14} className="inline-block shrink-0" />
            <span className="truncate">Hình ảnh: {fileName || "Không có tên"}</span>
          </span>
        );
      }
      if (mimeType.startsWith("video/")) {
        return (
          <span className="flex items-center gap-1">
            <Video size={14} className="inline-block shrink-0" />
            <span className="truncate">Video: {fileName || "Không có tên"}</span>
          </span>
        );
      }
      
      return (
        <span className="flex items-center gap-1">
          <FileText size={14} className="inline-block shrink-0" />
          <span className="truncate">Tệp: {fileName || "Không có tên"}</span>
        </span>
      );
    }
  };

  return (
    <div
      onClick={() => onClick(message.id)}
      className="cursor-pointer hover:bg-gray-100 p-3 rounded-xl transition flex gap-3 items-start"
    >
      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={fullName}
            width={40}
            height={40}
            className="rounded-full object-cover w-full h-full"
          />
        ) : (
          <User size={20} className="text-gray-400" />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-semibold text-sm text-gray-900 truncate mr-2">
            {fullName}
          </span>
          <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
            {formatTimeAgo(message.createdAt)}
          </span>
        </div>

        <div className="text-sm text-gray-600 truncate">{renderSnippet()}</div>
      </div>
    </div>
  );
}
