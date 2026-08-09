import React, { useEffect, useRef, useState, useMemo } from "react";
import { X, User, FileText, Download, Bell } from "lucide-react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  followDirectThread,
  followThread,
  unfollowDirectThread,
  getDirectThreadMessages,
  getThreadMessages,
} from "../../api/chat.api";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { useDirectMessageActions } from "../../hooks/useDirectMessageActions";
import { formatDateTime } from "@/lib/date";
import ThreadChatInput from "../input/thread-chat-input";
import { renderMessageContent } from "../../utils/message-formatter";
import { toast } from "react-toastify";

interface ThreadDetailViewProps {
  rootMessage: any;
  isDirect?: boolean;
  onBack: () => void;
}

export default function ThreadDetailView({
  rootMessage,
  isDirect = false,
  onBack,
}: ThreadDetailViewProps) {
  const queryClient = useQueryClient();
  const { sendMessage: sendDirectThreadReply } = useDirectMessageActions();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<any>(null);

  const initialFollow = useMemo(() => {
    return rootMessage.threadFollowers?.some(
      (tf: any) => (typeof tf === "string" ? tf === currentUserId : tf.userId === currentUserId)
    ) || false;
  }, [rootMessage.threadFollowers, currentUserId]);

  const [isFollowing, setIsFollowing] = useState(initialFollow);

  useEffect(() => {
    setIsFollowing(initialFollow);
  }, [initialFollow]);

  const handleToggleFollow = async () => {
    try {
      const res = isDirect
        ? isFollowing
          ? await unfollowDirectThread(rootMessage.id)
          : await followDirectThread(rootMessage.id)
        : await followThread(rootMessage.id);
      const following = res.data.following;
      setIsFollowing(following);
      toast.success(
        following ? "Following: you will receive notifications for this thread" : "Unfollowed this thread"
      );
    } catch {
      toast.error("Failed to change follow status");
    }
  };

  // Fetch thread messages (root message + replies)
  const { data: threadData, isLoading } = useQuery({
    queryKey: ["threadMessages", isDirect ? "direct" : "channel", rootMessage.id],
    queryFn: () =>
      isDirect
        ? getDirectThreadMessages(rootMessage.id)
        : getThreadMessages(rootMessage.id),
    staleTime: 1000 * 30, // 30s
  });

  const replies = threadData?.data?.replies || [];
  const threadSenderIds = useMemo(() => {
    const ids = new Set<string>();
    if (rootMessage.senderId) {
      ids.add(rootMessage.senderId);
    }
    replies.forEach((reply: any) => {
      if (reply.senderId) {
        ids.add(reply.senderId);
      }
    });
    return Array.from(ids);
  }, [replies, rootMessage.senderId]);
  const memberProfiles = useChatMemberProfiles(threadSenderIds);

  // Listen to new replies via WebSockets
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.threadParentId === rootMessage.id) {
        queryClient.setQueryData(
          ["threadMessages", isDirect ? "direct" : "channel", rootMessage.id],
          (oldData: any) => {
            if (!oldData) return oldData;
            // Prevent duplicate insertion
            const currentReplies = oldData.data?.replies || [];
            if (currentReplies.some((r: any) => r.id === msg.id)) {
              return oldData;
            }
            return {
              ...oldData,
              data: {
                ...oldData.data,
                replies: [...currentReplies, msg],
              },
            };
          },
        );
      }
    };

    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
    };
  }, [isDirect, rootMessage.id, queryClient]);

  // Scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  // Focus input when the thread details view opens or the active thread message changes
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
    const timer = setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [rootMessage.id]);

  const handleSendReply = (
    content: string,
    media?: any[],
    mentions?: string[],
  ) => {
    const socket = socketService.getSocket();

    if (isDirect) {
      sendDirectThreadReply({
        conversationId: rootMessage.conversationId ?? rootMessage.channelId,
        content,
        medias: media,
        threadParentId: rootMessage.id,
        onSent: () => {
          queryClient.invalidateQueries({
            queryKey: ["threadMessages", "direct", rootMessage.id],
          });
          queryClient.invalidateQueries({
            queryKey: [
              "conversation-threads",
              "direct",
              rootMessage.conversationId ?? rootMessage.channelId,
            ],
          });
        },
      })
        .catch(() => toast.error("Failed to send reply"));
      return;
    }

    if (!socket) return;

    socket.emit(ChatEvent.SEND_MESSAGE, {
      channelId: rootMessage.channelId,
      content,
      medias: media,
      threadParentId: rootMessage.id,
      mentions,
    });
  };

  const getProfile = (userId: string) => {
    return memberProfiles[userId] || null;
  };
  const rootProfile = getProfile(rootMessage.senderId);
  const rootAvatarUrl = rootProfile?.avatarUrl || undefined;

  const renderThreadMessageMedias = (messageItem: any) => {
    if (!messageItem.medias || messageItem.medias.length === 0) return null;

    const visualMedias = messageItem.medias.filter(
      (m: any) => m.type === "IMAGE" || m.type === "VIDEO",
    );
    const fileMedias = messageItem.medias.filter(
      (m: any) => m.type !== "IMAGE" && m.type !== "VIDEO",
    );

    return (
      <div className="mt-2 space-y-2 max-w-full">
        {/* Render images/videos */}
        {visualMedias.length > 0 && (
          <div className="grid gap-1 grid-cols-1 max-w-[240px]">
            {visualMedias.map((media: any) => {
              if (media.type === "IMAGE") {
                return (
                  <a
                    key={media.id}
                    href={media.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer overflow-hidden rounded-lg block border border-gray-100 shadow-sm"
                  >
                    <img
                      src={media.fileUrl}
                      alt={media.name}
                      className="w-full max-h-[160px] object-cover hover:opacity-90 transition"
                    />
                  </a>
                );
              } else {
                return (
                  <div
                    key={media.id}
                    className="relative w-full rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-black/5"
                  >
                    <video
                      src={media.fileUrl}
                      controls
                      className="w-full max-h-[160px] object-cover"
                    />
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Render file attachments */}
        {fileMedias.length > 0 && (
          <div className="flex flex-col gap-1.5 max-w-full">
            {fileMedias.map((media: any) => {
              const formatSize = (bytes: number) => {
                if (bytes === 0) return "0 B";
                const k = 1024;
                const sizes = ["B", "KB", "MB"];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return (
                  parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +
                  " " +
                  sizes[i]
                );
              };

              return (
                <div
                  key={media.id}
                  className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition max-w-[240px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-blue-50 text-blue-500 flex-shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium truncate text-gray-800">
                        {media.name}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {formatSize(media.sizeBytes)}
                      </span>
                    </div>
                  </div>
                  <a
                    href={media.fileUrl}
                    download={media.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition"
                  >
                    <Download size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Thread Discussion</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFollow}
            className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer"
            title={isFollowing ? "Following this thread" : "Follow this thread"}
          >
            <Bell
              size={18}
              className={isFollowing ? "fill-blue-500 text-blue-500" : "text-gray-400"}
            />
          </button>
          <button
            onClick={onBack}
            className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition animate-fade-in"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Message List area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Root parent message */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center font-bold text-sm text-blue-600 overflow-hidden">
              {rootAvatarUrl ? (
                <Image
                  src={rootAvatarUrl}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <User size={16} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-bold text-xs text-gray-900 truncate">
                  {rootMessage.senderId === currentUserId
                    ? "You"
                    : getProfile(rootMessage.senderId)?.fullName ||
                      "User"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatDateTime(rootMessage.createdAt)}
                </span>
              </div>
              <div className="text-xs text-gray-800 break-words bg-gray-200 p-2.5 rounded-lg border border-gray-100">
                {rootMessage.content ? (
                  renderMessageContent(
                    rootMessage.content,
                    memberProfiles ?? undefined,
                  )
                ) : (
                  <span className="text-gray-400 italic">[Attachment]</span>
                )}
                {renderThreadMessageMedias(rootMessage)}
              </div>
            </div>
          </div>
          <div className="mt-2 pl-11 text-[10px] font-semibold text-gray-500">
            {replies.length} replies
          </div>
        </div>

        {/* Loading / Replies */}
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-4">
            Loading comments...
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply: any) => {
              const profile = getProfile(reply.senderId);
              return (
                <div key={reply.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-xs overflow-hidden">
                    {profile?.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt="Avatar"
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <User size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="font-bold text-xs text-gray-700 truncate">
                        {reply.senderId === currentUserId
                          ? "You"
                          : profile?.fullName || "User"}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-800 break-words bg-gray-100/50 p-2 rounded-lg">
                      {renderMessageContent(
                        reply.content,
                        memberProfiles ?? undefined,
                      )}
                      {renderThreadMessageMedias(reply)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input bar */}
      <ThreadChatInput ref={chatInputRef} onSendMessage={handleSendReply} />
    </div>
  );
}
