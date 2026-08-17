import React, { useMemo, useState } from "react";
import { MoreHorizontal, Pin, MessageSquare, SmilePlus } from "lucide-react";
import { MessageOptionsDropdown } from "./message-options-dropdown";
import {
  QUICK_EMOJIS,
  UserProfileSnapshotResponse,
} from "../../types/chat.types";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import PollMessage from "./poll-message";
import NoteMessage from "./note-message";
import ReactionDetailModal from "../modals/reaction-detail-modal";
import MediaLightbox from "./media-lightbox";
import { renderMessageContent } from "../../utils/message-formatter";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import MessageAvatar from "./message-avatar";
import { MessageFileMedias, MessageVisualMedias } from "./message-attachments";
import MessageReactions from "./message-reactions";
import MessageReadReceipts from "./message-read-receipts";
import { MemberProfilesMap, RenderableChatMessage } from "./chat-message.types";

interface ChatMessageProps {
  msg: RenderableChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  memberProfile: UserProfileSnapshotResponse | null;
  memberProfiles: MemberProfilesMap;
  memberRole?: "ADMIN" | "MEMBER";
  spaceCreatorId?: string | null;
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
  onEditMessage?: (msg: RenderableChatMessage) => void;
  onRecallMessage?: (msg: RenderableChatMessage) => void;
  onJumpToMessage?: (messageId: string) => void;
  onPinMessage?: (msg: RenderableChatMessage) => void;
  onThreadReply?: (msg: RenderableChatMessage) => void;
}

const ChatMessage = React.memo(function ChatMessage({
  msg,
  isMe,
  showAvatar,
  memberProfile,
  memberProfiles,
  memberRole,
  spaceCreatorId,
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
  onPinMessage,
  onThreadReply,
}: ChatMessageProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isReactionDetailOpen, setIsReactionDetailOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [optionsMenuRect, setOptionsMenuRect] = useState<DOMRect | null>(null);

  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth);

  const time = useMemo(() => formatDateTime(msg.createdAt), [msg.createdAt]);
  const isWithin24Hours = useMemo(() => {
    const now = new Date().getTime();
    const createdAt = new Date(msg.createdAt).getTime();
    return now - createdAt <= 24 * 60 * 60 * 1000;
  }, [msg.createdAt]);

  const visualMedias = useMemo(
    () =>
      msg.medias?.filter(
        (media) => media.type === "IMAGE" || media.type === "VIDEO",
      ) || [],
    [msg.medias],
  );
  const fileMedias = useMemo(
    () =>
      msg.medias?.filter(
        (media) => media.type !== "IMAGE" && media.type !== "VIDEO",
      ) || [],
    [msg.medias],
  );
  const renderedMessageContent = useMemo(
    () => renderMessageContent(msg.content, memberProfiles ?? undefined),
    [msg.content, memberProfiles],
  );

  const hasText = !!msg.content?.trim();
  const senderName = memberProfile?.fullName || "User";
  const currentUserId = currentUser?.userId;

  const openSenderProfile = () => {
    if (msg.senderId) {
      dispatch(setSelectedProfileUserId(msg.senderId));
    }
  };

  const handleReactionClick = (emoji: string) => {
    if (!onReact) return;

    const hasReacted = msg.reactions?.some(
      (reaction) =>
        reaction.userId === currentUserId && reaction.emoji === emoji,
    );
    onReact(msg.id, emoji, hasReacted ? "remove" : "add");
    setShowReactionPicker(false);
  };

  if (msg.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
            {time}
          </span>
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

  return (
    <div
      id={`msg-${msg.id}`}
      className={cn(
        "w-full flex flex-col mb-1.5 group transition-all duration-200 rounded-2xl",
        msg.threadReplyCount &&
          msg.threadReplyCount > 0 &&
          "bg-indigo-50/50 border border-indigo-100/80 py-2.5 px-4 shadow-[0_4px_12px_rgba(99,102,241,0.02)]",
      )}
    >
      <div
        className="flex w-full justify-start relative"
        onMouseLeave={() => setShowReactionPicker(false)}
      >
        <MessageAvatar
          showAvatar={showAvatar}
          senderName={senderName}
          senderProfile={memberProfile}
          memberRole={memberRole}
          spaceCreatorId={spaceCreatorId}
          onClick={openSenderProfile}
        />

        <div className="max-w-[70%] flex flex-col gap-1 relative group/bubble items-start">
          {showSenderName && (
            <div className="flex items-baseline gap-2 px-1 mt-0.5 mb-0.5 min-w-0">
              <button
                type="button"
                onClick={openSenderProfile}
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
            <div className="p-3 shadow-sm text-sm flex flex-col relative italic text-slate-400 bg-slate-100/50 border border-slate-200/40 rounded-2xl rounded-tl-none">
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

              <MessageVisualMedias
                medias={visualMedias}
                onPreview={setPreviewIndex}
              />
              <MessageFileMedias medias={fileMedias} isMe={isMe} />

              <div className="flex flex-col relative max-w-full">
                {hasText && (
                  <div
                    className={cn(
                      "p-3 text-sm flex flex-col relative break-words w-full max-w-full overflow-hidden leading-relaxed transition-all duration-200 font-medium rounded-2xl rounded-tl-none",
                      msg.threadReplyCount && msg.threadReplyCount > 0
                        ? "bg-indigo-50 border border-indigo-100 text-indigo-950 shadow-sm"
                        : "bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.06)]",
                    )}
                  >
                    {renderedMessageContent}
                  </div>
                )}

                <MessageReactions
                  reactions={msg.reactions}
                  currentUserId={currentUserId}
                  onReactionClick={handleReactionClick}
                  onOpenDetails={() => setIsReactionDetailOpen(true)}
                />

                {msg.threadReplyCount && msg.threadReplyCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onThreadReply?.(msg)}
                    className="flex items-center gap-2 mt-2 text-xs font-bold cursor-pointer hover:underline p-1.5 rounded-lg w-fit border transition-colors text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/70 mr-auto"
                  >
                    <MessageSquare size={12} className="text-indigo-500" />
                    <span>{msg.threadReplyCount} replies</span>
                    {msg.threadLastReplyAt && (
                      <span className="text-[10px] text-indigo-400 font-normal">
                        Last: {formatDateTime(msg.threadLastReplyAt)}
                      </span>
                    )}
                  </button>
                ) : null}
              </div>
            </>
          )}

          {showTime && !showSenderName && (
            <div
              className={cn(
                "flex flex-col",
                isMe ? "items-end" : "items-start",
              )}
            >
              <span className="text-[9px] text-slate-400 px-1 mt-0.5 flex gap-1 items-center font-bold tracking-tight">
                {time}
                {msg.edited && (
                  <span className="text-slate-400/80 font-normal">
                    (Edited)
                  </span>
                )}
              </span>
            </div>
          )}

          {!msg.recalled && (
            <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
              <button
                type="button"
                onClick={() => onThreadReply?.(msg)}
                title="Reply to thread"
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm cursor-pointer hover:scale-105 transition-all duration-150"
              >
                <MessageSquare size={14} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm cursor-pointer hover:scale-105 transition-all duration-150"
                >
                  <SmilePlus size={14} />
                </button>

                {showReactionPicker && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-full shadow-lg p-1 flex gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => handleReactionClick(emoji)}
                        className="w-7 h-7 flex items-center justify-center text-base hover:bg-slate-100 rounded-full transition-all duration-150 cursor-pointer hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(event) => {
                  setOptionsMenuRect(
                    event.currentTarget.getBoundingClientRect(),
                  );
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

      <MessageReadReceipts
        readBy={readBy}
        currentUserId={currentUserId}
        memberProfiles={memberProfiles}
      />

      <ReactionDetailModal
        isOpen={isReactionDetailOpen}
        onClose={() => setIsReactionDetailOpen(false)}
        reactions={(msg.reactions || []).map((reaction) => {
          const profile = memberProfiles[reaction.userId];
          return {
            ...reaction,
            user: profile
              ? {
                  name: profile.fullName || "User",
                  avatarUrl: profile.avatarUrl || "",
                }
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
