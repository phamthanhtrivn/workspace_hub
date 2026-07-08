import React, { useState } from "react";
import { User, FileText, Download, Play } from "lucide-react";
import Image from "next/image";
import { UserProfileResponse } from "../types/chat.types";
import { formatFileSize } from "@/lib/file";
import MediaLightbox from "./media-lightbox";

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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasText = msg.content && msg.content.trim().length > 0;

  const visualMedias =
    msg.medias?.filter((m: any) => m.type === "IMAGE" || m.type === "VIDEO") ||
    [];
  const fileMedias =
    msg.medias?.filter((m: any) => m.type !== "IMAGE" && m.type !== "VIDEO") ||
    [];

  if (msg.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 w-full">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 text-center shadow-sm">
          {msg.content}
        </span>
      </div>
    );
  }

  const renderVisualMedias = () => {
    if (visualMedias.length === 0) return null;

    // Determine grid columns based on number of visual medias
    let gridClass = "grid-cols-1";
    if (visualMedias.length === 2) gridClass = "grid-cols-2";
    else if (visualMedias.length >= 3) gridClass = "grid-cols-3";

    return (
      <div
        className={`grid gap-1 ${gridClass} w-full ${visualMedias.length === 1 ? "max-w-sm" : "max-w-xs sm:max-w-sm md:max-w-md"}`}
      >
        {visualMedias.map((media: any) => {
          if (media.type === "IMAGE") {
            const mediaIndex = visualMedias.findIndex(
              (m: any) => m.id === media.id,
            );
            return (
              <div
                key={media.id}
                className="cursor-pointer overflow-hidden rounded-lg bg-black/5"
                onClick={() => setPreviewIndex(mediaIndex)}
              >
                <img
                  src={media.fileUrl}
                  alt={media.name}
                  className={`w-full hover:opacity-90 transition ${
                    visualMedias.length === 1
                      ? "max-h-[300px] object-contain"
                      : "aspect-square object-cover"
                  }`}
                />
              </div>
            );
          } else {
            const mediaIndex = visualMedias.findIndex(
              (m: any) => m.id === media.id,
            );
            return (
              <div
                key={media.id}
                className={`relative w-full rounded-lg overflow-hidden bg-black/5 cursor-pointer group ${
                  visualMedias.length === 1 ? "" : "aspect-square"
                }`}
                onClick={() => setPreviewIndex(mediaIndex)}
              >
                <video
                  src={media.fileUrl}
                  className={`w-full ${
                    visualMedias.length === 1
                      ? "max-h-[300px] object-contain bg-black"
                      : "h-full object-cover"
                  }`}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                  <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-lg">
                    <Play size={20} className="ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  const renderFileMedias = () => {
    if (fileMedias.length === 0) return null;
    return (
      <div className="flex flex-col gap-2 max-w-full">
        {fileMedias.map((media: any) => (
          <a
            key={media.id}
            href={media.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between gap-3  py-2 px-3 rounded-xl border ${isMe ? "bg-[#DBEAFE] border-blue-500/50 hover:bg-blue-600/50" : "bg-gray-50 border-gray-200 hover:bg-gray-100"} transition cursor-pointer`}
          >
            <div className="flex gap-3">
              <div
                className={`p-2 rounded-lg ${isMe ? "bg-blue-500 text-white" : "bg-white text-blue-500 shadow-sm"}`}
              >
                <FileText size={20} />
              </div>
              <div className="flex flex-col min-w-0 max-w-[180px]">
                <span className="text-sm font-medium truncate">
                  {media.name}
                </span>
                <span
                  className={`text-[10px] ${isMe ? "text-gray-900" : "text-gray-500"}`}
                >
                  {formatFileSize(media.sizeBytes)}
                </span>
              </div>
            </div>
            <div>
              <Download
                size={16}
                className={`ml-1 cursor-pointer ${isMe ? "text-gray-900" : "text-gray-500"}`}
              />
            </div>
          </a>
        ))}
      </div>
    );
  };

  return (
    <>
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
          className={`max-w-[70%] flex flex-col gap-1 ${
            isMe ? "items-end" : "items-start"
          }`}
        >
          {renderVisualMedias()}
          {renderFileMedias()}
          {hasText && (
            <div
              className={`p-3 shadow-sm text-sm flex flex-col ${
                isMe
                  ? "bg-[#DBEAFE] text-black rounded-2xl rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          )}
          <span
            className={`text-[10px] text-gray-700 px-1 ${
              isMe ? "self-end" : "self-start"
            }`}
          >
            {time}
          </span>
        </div>
      </div>

      {previewIndex !== null && visualMedias.length > 0 && (
        <MediaLightbox
          medias={visualMedias}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  );
}
