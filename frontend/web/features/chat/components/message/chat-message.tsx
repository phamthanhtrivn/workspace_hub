import React, { useState, useMemo } from "react";
import { MessageOptionsDropdown } from "./message-options-dropdown";
import {
  FileText,
  Play,
  Download,
  User,
  SmilePlus,
  MoreHorizontal,
  Pin,
  Key,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { QUICK_EMOJIS, UserProfileResponse } from "../../types/chat.types";
import { formatFileSize } from "@/lib/file";
import { saveAs } from "file-saver";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { isAudioFile, renderAudioPlayer } from "../../utils/media-utils";
import PollMessage from "./poll-message";
import NoteMessage from "./note-message";
import ReactionDetailModal from "../modals/reaction-detail-modal";
import MediaLightbox from "./media-lightbox";
import { renderMessageContent } from "../../utils/message-formatter";

interface ChatMessageProps {
  msg: any;
  isMe: boolean;
  showAvatar: boolean;
  memberProfile: UserProfileResponse | null;
  memberProfiles: Record<string, UserProfileResponse>;
  memberRole?: "OWNER" | "ADMIN" | "MEMBER";
  readBy?: string[];
  showTime?: boolean;
  showSenderName?: boolean;
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
  onNoteEdit?: (messageId: string, title: string, content: string) => void;
  onEditMessage?: (msg: any) => void;
  onRecallMessage?: (msg: any) => void;
  onJumpToMessage?: (messageId: string) => void;
  onPinMessage?: (msg: any) => void;
  onThreadReply?: (msg: any) => void;
}

const ChatMessage = React.memo(function ChatMessage({
  msg,
  isMe,
  showAvatar,
  memberProfile,
  memberProfiles,
  memberRole,
  readBy = [],
  showTime = true,
  showSenderName = false,
  onReact,
  onPollVote,
  onPollAddOption,
  onPollEdit,
  onNoteEdit,
  onEditMessage,
  onRecallMessage,
  onJumpToMessage,
  onPinMessage,
  onThreadReply,
}: ChatMessageProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isReactionDetailOpen, setIsReactionDetailOpen] = useState(false);

  // Message Options state
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [optionsMenuRect, setOptionsMenuRect] = useState<DOMRect | null>(null);

  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth);

  const time = useMemo(() => {
    return new Date(msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [msg.createdAt]);

  const isWithin24Hours = useMemo(() => {
    const now = new Date().getTime();
    const createdAt = new Date(msg.createdAt).getTime();
    return now - createdAt <= 24 * 60 * 60 * 1000;
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

  const renderedMessageContent = useMemo(() => {
    return renderMessageContent(msg.content, memberProfiles ?? undefined);
  }, [msg.content, memberProfiles]);

  const senderName = memberProfile?.fullName || "User";

  if (msg.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{time}</span>
          <span className="text-xs text-slate-500 bg-slate-100/80 backdrop-blur-sm border border-slate-200/50 px-4 py-1.5 rounded-full text-center shadow-[0_2px_6px_rgba(0,0,0,0.02)] font-medium">
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
        onEditPoll={(
          title,
          multipleChoice,
          allowAddOptions,
          anonymous,
          isLocked,
        ) =>
          onPollEdit?.(
            msg.id,
            title,
            multipleChoice,
            allowAddOptions,
            anonymous,
            isLocked,
          )
        }
      />
    );
  }

  if (msg.type === "NOTE" && msg.note) {
    return (
      <NoteMessage
        note={msg.note}
        onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
        onEditNote={(title, content) => onNoteEdit?.(msg.id, title, content)}
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
        className={`grid gap-1.5 ${gridClass} w-full max-w-full ${visualMedias.length === 1 ? "sm:max-w-sm" : "sm:max-w-xs sm:max-w-sm md:max-w-md"} rounded-2xl overflow-hidden`}
      >
        {visualMedias.map((media: any) => {
          if (media.type === "IMAGE") {
            const mediaIndex = visualMedias.findIndex(
              (m: any) => m.id === media.id,
            );
            return (
              <div
                key={media.id}
                className="cursor-pointer overflow-hidden bg-black/5 hover:opacity-95 transition-opacity"
                onClick={() => setPreviewIndex(mediaIndex)}
              >
                <img
                  src={media.fileUrl}
                  alt={media.name}
                  className={`w-full transition duration-200 hover:scale-102 ${
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
                className={`relative w-full overflow-hidden bg-black/5 cursor-pointer group ${
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
        {fileMedias.map((media: any) => {
          if (isAudioFile(media)) {
            return renderAudioPlayer(media, isMe);
          }

          return (
            <div
              key={media.id}
              className={`flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl border transition ${isMe ? "bg-[#DBEAFE]/80 border-blue-400/40 text-blue-900" : "bg-white border-slate-200/60 hover:bg-slate-50 text-slate-800"} shadow-sm`}
            >
              <div className="flex gap-3">
                <div
                  className={`p-2 rounded-lg ${isMe ? "bg-blue-600 text-white" : "bg-slate-100 text-blue-600 shadow-sm"}`}
                >
                  <FileText size={20} />
                </div>
                <div className="flex flex-col min-w-0 max-w-[180px]">
                  <span className="text-sm font-semibold truncate">
                    {media.name}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${isMe ? "text-blue-700/80" : "text-slate-400"}`}
                  >
                    {formatFileSize(media.sizeBytes)}
                  </span>
                </div>
              </div>
              <div>
                <Download
                  onClick={(e) => handleDownload(e, media.fileUrl, media.name)}
                  size={16}
                  className={`ml-1 cursor-pointer transition p-1 rounded-lg ${isMe ? "text-blue-800 hover:bg-blue-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
                />
              </div>
            </div>
          );
        })}
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
      <div className="flex flex-wrap gap-1 mt-1.5">
        {Object.keys(grouped).map((emoji) => {
          const count = grouped[emoji].length;
          const userReacted = grouped[emoji].some(
            (r: any) => r.userId === currentUser?.userId,
          );
          return (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={`cursor-pointer flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border transition-all duration-150 ${userReacted ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" : "bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsReactionDetailOpen(true)}
          className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-600 hover:underline px-2 py-0.5 transition"
        >
          Details
        </button>
      </div>
    );
  };

  const renderReadReceipts = () => {
    const otherReaders = readBy.filter(
      (userId) => userId !== currentUser?.userId,
    );

    if (otherReaders.length === 0) return null;

    return (
      <div className="flex w-full justify-end px-2 mt-0.5">
        <div className="flex items-center gap-1 -space-x-1.5 self-end">
          {otherReaders.slice(0, 5).map((userId: string, idx: number) => {
            const readerProfile = memberProfiles?.[userId];
            return (
              <div
                key={idx}
                className="w-4 h-4 rounded-full bg-slate-200 border-2 border-white overflow-hidden relative cursor-pointer shadow-sm hover:z-10 transition-transform hover:scale-105"
                title={`${readerProfile?.fullName || "User"} viewed`}
              >
                {readerProfile?.avatarUrl ? (
                  <img
                    src={readerProfile.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover animate-fade-in"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
                    <User size={10} className="text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
          {otherReaders.length > 5 && (
            <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center hover:z-10 relative z-0 shadow-sm">
              <span className="text-[7px] text-slate-600 font-bold leading-none">
                +{otherReaders.length - 5}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      id={`msg-${msg.id}`}
      className={`w-full flex flex-col mb-1.5 group transition-all duration-200 rounded-2xl ${
        msg.threadReplyCount > 0
          ? "bg-indigo-50/50 border border-indigo-100/80 py-2.5 px-4 shadow-[0_4px_12px_rgba(99,102,241,0.02)]"
          : ""
      }`}
    >
      <div
        className="flex w-full justify-start relative"
        onMouseLeave={() => setShowReactionPicker(false)}
      >
        <div
          onClick={() =>
            showAvatar &&
            msg.senderId &&
            dispatch(setSelectedProfileUserId(msg.senderId))
          }
          className={`w-9 h-9 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-bold mt-1 mr-2.5 ${
            showAvatar
              ? "bg-gradient-to-br from-slate-100 to-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all shadow-sm"
              : ""
          }`}
        >
          {showAvatar ? (
            <div className="relative inline-block">
              {memberProfile?.avatarUrl ? (
                <Image
                  src={memberProfile.avatarUrl}
                  alt={senderName}
                  width={36}
                  height={36}
                  unoptimized
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                  <User size={15} className="text-slate-400" />
                </div>
              )}
              {memberRole === "OWNER" && (
                <div
                  className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white"
                  title="Owner"
                >
                  <Key size={10} className="text-white" />
                </div>
              )}
              {memberRole === "ADMIN" && (
                <div
                  className="absolute -bottom-1 -right-1 bg-gray-400 rounded-full p-0.5 border border-white"
                  title="Admin"
                >
                  <Key size={10} className="text-white" />
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="max-w-[70%] flex flex-col gap-1 relative group/bubble items-start">
          {showSenderName && (
            <div className="flex items-baseline gap-2 px-1 mt-0.5 mb-0.5 min-w-0">
              <button
                type="button"
                onClick={() =>
                  msg.senderId && dispatch(setSelectedProfileUserId(msg.senderId))
                }
                className="text-[13px] text-slate-700 font-bold tracking-tight hover:text-blue-600 transition-colors cursor-pointer truncate"
              >
                {senderName}
              </button>
              {showTime && (
                <span className="text-[11px] text-slate-400 font-medium shrink-0">
                  {time}
                </span>
              )}
            </div>
          )}
          {msg.recalled ? (
            <div
              className="p-3 shadow-sm text-sm flex flex-col relative italic text-slate-400 bg-slate-100/50 border border-slate-200/40 rounded-2xl rounded-tl-none"
            >
              Message recalled
            </div>
          ) : (
            <>
              {msg.pinned && (
                <div className="flex items-center gap-1 text-[11px] text-blue-600 font-bold px-1 mb-0.5">
                  <Pin size={12} className="fill-blue-600 text-blue-600" />
                  Pinned
                </div>
              )}
              {renderVisualMedias()}
              {renderFileMedias()}
              <div className="flex flex-col relative max-w-full">
                {hasText && (
                  <div
                    className={`p-3 text-sm flex flex-col relative break-words w-full max-w-full overflow-hidden leading-relaxed transition-all duration-200 ${
                      isMe
                        ? msg.threadReplyCount > 0
                          ? "bg-indigo-600 text-white rounded-2xl rounded-tl-none shadow-[0_4px_12px_rgba(99,102,241,0.15)] font-medium"
                          : "bg-blue-600 text-white rounded-2xl rounded-tl-none shadow-[0_4px_12px_rgba(37,99,235,0.15)] font-medium"
                        : msg.threadReplyCount > 0
                          ? "bg-indigo-50 border border-indigo-100 text-indigo-950 rounded-2xl rounded-tl-none shadow-sm font-medium"
                          : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-[0_2px_8px_-3px_rgba(0,0,0,0.06)] font-medium"
                    }`}
                  >
                    {renderedMessageContent}
                  </div>
                )}

                {renderReactions()}
                {(() => {
                  if (!msg.threadReplyCount || msg.threadReplyCount === 0)
                    return null;
                  return (
                    <div
                      onClick={() => onThreadReply?.(msg)}
                      className="flex items-center gap-2 mt-2 text-xs font-bold cursor-pointer hover:underline p-1.5 rounded-lg w-fit border transition-colors text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/70 mr-auto"
                    >
                      <MessageSquare size={12} className="text-indigo-500" />
                      <span>{msg.threadReplyCount} replies</span>
                      {msg.threadLastReplyAt && (
                        <span className="text-[10px] text-indigo-400 font-normal">
                          Last:{" "}
                          {new Date(msg.threadLastReplyAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {showTime && !showSenderName && (
            <div
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <span
                className={`text-[9px] text-slate-400 px-1 mt-0.5 flex gap-1 items-center font-bold tracking-tight`}
              >
                {time}
                {msg.edited && (
                  <span className="text-slate-400/80 font-normal">
                    (Edited)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Reaction & Options Buttons */}
          {!msg.recalled && (
            <div
              className="absolute top-1/2 -translate-y-1/2 left-full ml-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
            >
              <button
                onClick={() => onThreadReply?.(msg)}
                title="Reply to thread"
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm cursor-pointer hover:scale-105 transition-all duration-150"
              >
                <MessageSquare size={14} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm cursor-pointer hover:scale-105 transition-all duration-150"
                >
                  <SmilePlus size={14} />
                </button>

                {/* Quick Emojis Popup */}
                {showReactionPicker && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 left-full ml-2 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-full shadow-lg p-1 flex gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          handleReactionClick(emoji);
                          setShowReactionPicker(false);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-base hover:bg-slate-100 rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  setOptionsMenuRect(e.currentTarget.getBoundingClientRect());
                  setIsOptionsMenuOpen(true);
                }}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm cursor-pointer hover:scale-105 transition-all duration-150"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Read receipts placed at the far right of the conversation block */}
      {renderReadReceipts()}

      <ReactionDetailModal
        isOpen={isReactionDetailOpen}
        onClose={() => setIsReactionDetailOpen(false)}
        reactions={(msg.reactions || []).map((r: any) => {
          const profile = memberProfiles?.[r.userId];
          return {
            ...r,
            user: profile
              ? { name: profile.fullName, avatarUrl: profile.avatarUrl }
              : undefined,
          };
        })}
      />

      <MessageOptionsDropdown
        isOpen={isOptionsMenuOpen}
        onClose={() => setIsOptionsMenuOpen(false)}
        buttonRect={optionsMenuRect}
        isMe={isMe}
        canEdit={msg.type === "TEXT" && isWithin24Hours && hasText}
        canRecall={isWithin24Hours}
        isPinned={msg.pinned}
        onEdit={() => onEditMessage?.(msg)}
        onRecall={() => onRecallMessage?.(msg)}
        onPin={() => onPinMessage?.(msg)}
      />

      {previewIndex !== null && visualMedias.length > 0 && (
        <MediaLightbox
          medias={visualMedias}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
});

export default ChatMessage;
