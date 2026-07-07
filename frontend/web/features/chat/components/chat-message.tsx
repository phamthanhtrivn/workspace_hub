import { User, FileText, Download } from "lucide-react";
import Image from "next/image";
import { UserProfileResponse } from "../types/chat.types";
import { formatFileSize } from "@/lib/file";

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

  const hasMedias = msg.medias && msg.medias.length > 0;
  const hasText = msg.content && msg.content.trim().length > 0;

  if (msg.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 w-full">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 text-center shadow-sm">
          {msg.content}
        </span>
      </div>
    );
  }

  const renderMedias = () => {
    if (!hasMedias) return null;
    return (
      <div className="flex flex-col gap-2 mb-1">
        {msg.medias.map((media: any) => {
          if (media.type === "IMAGE") {
            return (
              <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" key={media.id}>
                <img 
                  src={media.fileUrl} 
                  alt={media.name} 
                  className="max-w-full rounded-lg max-h-[300px] object-contain hover:opacity-90 transition cursor-pointer" 
                />
              </a>
            );
          } else if (media.type === "VIDEO") {
            return (
              <div key={media.id} className="relative w-full max-w-sm rounded-lg overflow-hidden bg-black/5">
                <video 
                  src={media.fileUrl} 
                  controls 
                  className="w-full max-h-[300px] object-contain rounded-lg"
                />
              </div>
            );
          } else {
            return (
              <a
                key={media.id}
                href={media.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-2 rounded-xl border ${isMe ? "bg-blue-600/30 border-blue-500/50 hover:bg-blue-600/50" : "bg-gray-50 border-gray-200 hover:bg-gray-100"} transition cursor-pointer`}
              >
                <div className={`p-2 rounded-lg ${isMe ? "bg-blue-500 text-white" : "bg-white text-blue-500 shadow-sm"}`}>
                  <FileText size={20} />
                </div>
                <div className="flex flex-col min-w-0 max-w-[180px]">
                  <span className="text-sm font-medium truncate">{media.name}</span>
                  <span className={`text-[10px] ${isMe ? "text-blue-200" : "text-gray-500"}`}>
                    {formatFileSize(media.sizeBytes)}
                  </span>
                </div>
                <Download size={16} className={`ml-1 ${isMe ? "text-white" : "text-gray-500"}`} />
              </a>
            );
          }
        })}
      </div>
    );
  };

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
        {hasText ? (
          <div
            className={`p-3 shadow-sm text-sm flex flex-col ${
              isMe
                ? "bg-[var(--color-secondary)] text-white rounded-2xl rounded-br-sm"
                : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm"
            }`}
          >
            {renderMedias()}
            <p className="whitespace-pre-wrap">{msg.content}</p>
            <span
              className={`text-[10px] mt-1 self-end ${isMe ? "text-blue-200" : "text-gray-400"}`}
            >
              {time}
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            {renderMedias()}
            <span
              className={`text-[10px] mt-1 self-end ${isMe ? "text-gray-400" : "text-gray-500"}`}
            >
              {time}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
