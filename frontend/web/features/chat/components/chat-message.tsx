import { User } from "lucide-react";
import Image from "next/image";
import { UserProfileResponse } from "../types/chat.types";

interface ChatMessageProps {
  msg: any;
  isMe: boolean;
  showAvatar: boolean;
  memberProfile: UserProfileResponse | null;
}

export default function ChatMessage({
  msg,
  isMe,
  showAvatar,
  memberProfile,
}: ChatMessageProps) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex items-end gap-2 ${isMe ? "justify-end" : ""}`}>
      {!isMe && (
        <div
          className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-bold overflow-hidden ${
            showAvatar ? "bg-gradient-to-br from-gray-100 to-gray-200" : ""
          }`}
        >
          {showAvatar ? (
            memberProfile?.avatarUrl ? (
              <Image
                src={memberProfile.avatarUrl}
                alt="Avatar"
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <User size={16} className="text-gray-400" />
            )
          ) : null}
        </div>
      )}

      <div
        className={`max-w-[70%] flex flex-col ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`p-3 shadow-sm text-sm flex flex-col ${
            isMe
              ? "bg-[var(--color-secondary)] text-white rounded-2xl rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
          <span
            className={`text-[10px] mt-1 self-end ${isMe ? "text-blue-200" : "text-gray-400"}`}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
