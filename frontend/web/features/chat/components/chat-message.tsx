import React, { useState, useMemo } from "react";
import { User, FileText, Download, Play } from "lucide-react";
import Image from "next/image";
import { QUICK_EMOJIS, UserProfileResponse } from "../types/chat.types";
import { formatFileSize } from "@/lib/file";
import MediaLightbox from "./media-lightbox";
import { saveAs } from "file-saver";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import PollMessage from "./poll-message";
import NoteMessage from "./note-message";
import ReactionDetailModal from "./reaction-detail-modal";
import { SmilePlus } from "lucide-react";

interface ChatMessageProps {
  msg: any;
  isMe: boolean;
  showAvatar: boolean;
  memberProfile: UserProfileResponse | null;
  onReact?: (
    messageId: string,
    emoji: string,
    action: "add" | "remove",
  ) => void;
  onReadClick?: (userId: string) => void;
  onPollVote?: (messageId: string, optionId: string) => void;
  onPollAddOption?: (messageId: string, text: string) => void;
  onPollEdit?: (
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    anonymous: boolean,
    isLocked: boolean,
  ) => void;
}

const ChatMessage = React.memo(function ChatMessage({
  msg,
  isMe,
  showAvatar,
  memberProfile,
  onReact,
  onReadClick,
  onPollVote,
  onPollAddOption,
  onPollEdit,
}: ChatMessageProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isReactionDetailOpen, setIsReactionDetailOpen] = useState(false);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth);

  const time = useMemo(() => {
    return new Date(msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [msg.createdAt]);

  const hasText = msg.content && msg.content.trim().length > 0;

  const visualMedias = useMemo(() => {
    return (
      msg.medias?.filter(
        (m: any) => m.type === "IMAGE" || m.type === "VIDEO",
      ) || []
    );
  }, [msg.medias]);

  const fileMedias = useMemo(() => {
    return (
      msg.medias?.filter(
        (m: any) => m.type !== "IMAGE" && m.type !== "VIDEO",
      ) || []
    );
  }, [msg.medias]);

  if (msg.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 w-full">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-gray-700 font-medium">{time}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 text-center shadow-sm">
            {msg.content}
          </span>
        </div>
      </div>
    );
  }

  if (msg.type === "POLL" && msg.poll) {
    return (
      <PollMessage
        poll={msg.poll}
        onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
        onVote={(optionId) => onPollVote?.(msg.id, optionId)}
        onAddOption={(text) => onPollAddOption?.(msg.id, text)}
        onEditPoll={(title, multipleChoice, allowAddOptions, anonymous, isLocked) =>
          onPollEdit?.(msg.id, title, multipleChoice, allowAddOptions, anonymous, isLocked)
        }
      />
    );
  }

  if (msg.type === "NOTE" && msg.note) {
    return (
      <NoteMessage
        note={msg.note}
        onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
      />
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

  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, name);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const renderFileMedias = () => {
    if (fileMedias.length === 0) return null;
    return (
      <div className="flex flex-col gap-2 max-w-full">
        {fileMedias.map((media: any) => (
          <div
            key={media.id}
            className={`flex items-center justify-between gap-3  py-2 px-3 rounded-xl border ${isMe ? "bg-[#DBEAFE] border-blue-500/50 " : "bg-gray-50 border-gray-200 hover:bg-gray-100"} transition `}
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
                onClick={(e) => handleDownload(e, media.fileUrl, media.name)}
                size={16}
                className={`ml-1 cursor-pointer ${isMe ? "text-gray-900 hover:bg-blue-100 hover:text-blue-600 rounded-full" : "text-gray-500 hover:bg-gray-100 hover:text-gray-600 rounded-full"}`}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleReactionClick = (emoji: string) => {
    if (!onReact) return;
    const hasReacted = msg.reactions?.some(
      (r: any) => r.userId === currentUser?.userId && r.emoji === emoji,
    );
    onReact(msg.id, emoji, hasReacted ? "remove" : "add");
    setShowReactionPicker(false);
  };

  const renderReactions = () => {
    if (!msg.reactions || msg.reactions.length === 0) return null;

    // Group reactions
    const grouped = msg.reactions.reduce((acc: any, curr: any) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr);
      return acc;
    }, {});

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.keys(grouped).map((emoji) => {
          const count = grouped[emoji].length;
          const userReacted = grouped[emoji].some(
            (r: any) => r.userId === currentUser?.userId,
          );
          return (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors ${userReacted ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}
            >
              <span>{emoji}</span>
              <span className="font-medium">{count}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsReactionDetailOpen(true)}
          className="text-[10px] text-gray-500 hover:underline px-1 py-0.5"
        >
          Chi tiết
        </button>
      </div>
    );
  };

  const renderReadReceipts = () => {
    if (!msg.readReceipts || msg.readReceipts.length === 0 || !isMe)
      return null;
    // Only show for the sender
    return (
      <div className="flex items-center gap-1 -space-x-1 mt-0.5 self-end">
        {msg.readReceipts.slice(0, 5).map((receipt: any, idx: number) => (
          <div
            key={idx}
            onClick={() => onReadClick?.(receipt.userId)}
            className="w-3.5 h-3.5 rounded-full bg-gray-200 border border-white cursor-pointer hover:z-10 overflow-hidden relative"
            title={`Đã xem lúc ${new Date(receipt.readAt).toLocaleTimeString()}`}
          >
            {receipt.user?.avatarUrl ? (
              <img
                src={receipt.user.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-[8px] font-bold text-white">
                {(receipt.user?.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {msg.readReceipts.length > 5 && (
          <div className="w-3.5 h-3.5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[7px] text-gray-500 font-medium">
            +{msg.readReceipts.length - 5}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`flex items-end gap-2 group ${isMe ? "justify-end" : ""}`}
        onMouseLeave={() => setShowReactionPicker(false)}
      >
        {!isMe && (
          <div
            onClick={() =>
              showAvatar &&
              msg.senderId &&
              dispatch(setSelectedProfileUserId(msg.senderId))
            }
            className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-bold overflow-hidden ${
              showAvatar
                ? "bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all"
                : ""
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
          <div className="flex flex-col relative">
            {hasText && (
              <div
                className={`p-3 shadow-sm text-sm flex flex-col relative group/bubble ${
                  isMe
                    ? "bg-[#DBEAFE] text-black rounded-2xl rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Reaction Picker Button */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "-left-10" : "-right-10"} opacity-0 group-hover/bubble:opacity-100 transition-opacity`}
                >
                  <div className="relative">
                    <button
                      onClick={() => setShowReactionPicker(!showReactionPicker)}
                      className="p-1.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                      <SmilePlus size={16} />
                    </button>

                    {/* Quick Emojis Popup */}
                    {showReactionPicker && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-2" : "left-full ml-2"} bg-white border border-gray-200 rounded-full shadow-lg p-1.5 flex gap-1 z-20`}
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReactionClick(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-full transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {renderReactions()}
          </div>

          <div
            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
          >
            <span className={`text-[10px] text-gray-700 px-1`}>{time}</span>
            {renderReadReceipts()}
          </div>
        </div>
      </div>

      <ReactionDetailModal
        isOpen={isReactionDetailOpen}
        onClose={() => setIsReactionDetailOpen(false)}
        reactions={msg.reactions || []}
        onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
      />

      {previewIndex !== null && visualMedias.length > 0 && (
        <MediaLightbox
          medias={visualMedias}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  );
});

export default ChatMessage;
