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
import MeetingCardMessage from "./meeting-card-message";
import DocumentMessage from "./document-message";
import TaskCardMessage from "./task-card-message";
import { CHAT_MESSAGE_TYPES } from "../../types/document.constants";
import MediaLightbox from "./media-lightbox";
import { renderMessageContent } from "../../utils/message-formatter";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import MessageAvatar from "./message-avatar";
import { MessageFileMedias, MessageVisualMedias } from "./message-attachments";
import MessageReactions from "./message-reactions";
import MessageReadReceipts from "./message-read-receipts";
import { MemberProfilesMap, RenderableChatMessage } from "./chat-message.types";
import ReactionDetailModal from "../modals/message/reaction-detail-modal";
import { Button } from "@/components/ui/button";
import { AnchoredPopover } from "@/components/ui/anchored-popup";


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

  const hasText =
    msg.type !== CHAT_MESSAGE_TYPES.DOCUMENT && !!msg.content?.trim();
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
          <span className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
            {time}
          </span>
          <span className="text-xs text-muted-foreground bg-muted border border-border px-4 py-1.5 rounded-full text-center font-medium">
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

  if (msg.type === "MEETING") {
    return (
      <MeetingCardMessage
        message={msg}
        onUserClick={(userId) => dispatch(setSelectedProfileUserId(userId))}
      />
    );
  }

  const isTaskCard = (() => {
    if (msg.type === "TASK") return true;
    if (!msg.content) return false;
    const trimmed = msg.content.trim();
    if (trimmed.includes("[Task #")) return true;
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const json = JSON.parse(trimmed);
        return json.type === "TASK" || Boolean(json.taskId);
      } catch {
        return false;
      }
    }
    return false;
  })();

  return (
    <div
      id={`msg-${msg.id}`}
      className={cn(
        "min-w-0 w-full flex flex-col mb-1.5 [overflow-wrap:anywhere] [&_img]:max-w-full [&_video]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto group transition-all duration-200 rounded-panel",
        msg.threadReplyCount &&
          msg.threadReplyCount > 0 &&
          "bg-info-soft/50 border border-border py-2.5 px-4",
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

        <div className="min-w-0 max-w-[calc(100%-3rem)] @min-[720px]/messages:max-w-[70%] flex flex-col gap-1 relative group/bubble items-start">
          {showSenderName && (
            <div className="flex items-baseline gap-2 px-1 mt-0.5 mb-0.5 min-w-0">
              <Button variant="unstyled"
                type="button"
                onClick={openSenderProfile}
                className="text-[13px] text-foreground font-semibold tracking-tight hover:text-info-content transition-colors cursor-pointer truncate"
              >
                {senderName}
              </Button>
              {showTime && (
                <span className="text-xs text-muted-foreground font-medium shrink-0">
                  {time}
                </span>
              )}
            </div>
          )}

          {msg.recalled ? (
            <div className="p-3 text-sm flex flex-col relative italic text-muted-foreground bg-muted border border-border rounded-panel rounded-tl-none">
              Message recalled
            </div>
          ) : (
            <>
              {msg.pinned && (
                <div className="flex items-center gap-1 text-xs text-info-content font-semibold px-1 mb-0.5">
                  <Pin size={12} className="fill-info-content text-info-content" />
                  Pinned
                </div>
              )}

              <MessageVisualMedias
                medias={visualMedias}
                onPreview={setPreviewIndex}
              />
              <MessageFileMedias medias={fileMedias} isMe={isMe} />

              {msg.type === CHAT_MESSAGE_TYPES.DOCUMENT && (
                <DocumentMessage msg={msg} isMe={isMe} />
              )}

              <div className="flex flex-col relative max-w-full">
                {isTaskCard ? (
                  <TaskCardMessage
                    content={msg.content || ""}
                    projectId={"projectId" in msg && typeof msg.projectId === "string" ? msg.projectId : undefined}
                  />
                ) : (
                  hasText && (
                    <div
                      className={cn(
                        "p-3 text-sm flex flex-col relative break-words w-full max-w-full overflow-hidden leading-relaxed transition-all duration-200 font-medium rounded-panel rounded-tl-none",
                        msg.threadReplyCount && msg.threadReplyCount > 0
                          ? "bg-info-soft border border-border text-info-content"
                          : "bg-card border border-border text-foreground",
                      )}
                    >
                      {renderedMessageContent}
                    </div>
                  )
                )}

                <MessageReactions
                  reactions={msg.reactions}
                  currentUserId={currentUserId}
                  onReactionClick={handleReactionClick}
                  onOpenDetails={() => setIsReactionDetailOpen(true)}
                />

                {msg.threadReplyCount && msg.threadReplyCount > 0 ? (
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => onThreadReply?.(msg)}
                    className="flex items-center gap-2 mt-2 text-xs font-semibold cursor-pointer hover:underline p-1.5 rounded-control w-fit border transition-colors text-info-content bg-info-soft border-border hover:bg-info-soft/70 mr-auto"
                  >
                    <MessageSquare size={12} className="text-info-content" />
                    <span>{msg.threadReplyCount} replies</span>
                    {msg.threadLastReplyAt && (
                      <span className="text-xs text-info-content font-normal">
                        Last: {formatDateTime(msg.threadLastReplyAt)}
                      </span>
                    )}
                  </Button>
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
              <span className="text-xs text-muted-foreground px-1 mt-0.5 flex gap-1 items-center font-semibold tracking-tight">
                {time}
                {msg.edited && (
                  <span className="text-muted-foreground font-normal">
                    (Edited)
                  </span>
                )}
              </span>
            </div>
          )}

          {!msg.recalled && (
            <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
              <Button variant="unstyled"
                type="button"
                onClick={() => onThreadReply?.(msg)}
                title="Reply to thread"
                className="p-2 bg-card border border-border rounded-control text-muted-foreground hover:text-info-content hover:bg-info-soft hover:border-border cursor-pointer transition-all duration-150"
              >
                <MessageSquare size={14} />
              </Button>

              <div className="relative">
                <Button variant="unstyled" aria-label="Add reaction"
                  type="button"
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                  className="p-2 bg-card border border-border rounded-control text-muted-foreground hover:text-info-content hover:bg-info-soft hover:border-border cursor-pointer transition-all duration-150"
                >
                  <SmilePlus size={14} />
                </Button>

                {showReactionPicker && (
                  <AnchoredPopover onClose={() => setShowReactionPicker(false)} side="bottom" align="start" aria-label="Message reactions" className="ml-2 bg-card border border-border rounded-full p-1 flex gap-0.5 animate-in fade-in zoom-in-95 duration-100 shadow-panel">
                    {QUICK_EMOJIS.map((emoji) => (
                      <Button variant="unstyled"
                        type="button"
                        key={emoji}
                        onClick={() => handleReactionClick(emoji)}
                        className="w-7 h-7 flex items-center justify-center text-base hover:bg-muted rounded-full transition-all duration-150 cursor-pointer"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </AnchoredPopover>
                )}
              </div>

              <Button variant="unstyled" aria-label="Message options"
                type="button"
                onClick={(event) => {
                  setOptionsMenuRect(
                    event.currentTarget.getBoundingClientRect(),
                  );
                  setIsOptionsMenuOpen(true);
                }}
                className="p-2 bg-card border border-border rounded-control text-muted-foreground hover:text-info-content hover:bg-info-soft hover:border-border cursor-pointer transition-all duration-150"
              >
                <MoreHorizontal size={14} />
              </Button>
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
