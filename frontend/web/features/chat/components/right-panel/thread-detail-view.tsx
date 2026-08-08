import React, { useEffect, useRef, useState, useMemo } from "react";
import { X, User, FileText, Download, Bell } from "lucide-react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getThreadMessages, followThread } from "../../api/chat.api";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { formatConversationTime } from "@/lib/date";
import ThreadChatInput from "../input/thread-chat-input";
import { renderMessageContent } from "../../utils/message-formatter";
import { toast } from "react-toastify";

interface ThreadDetailViewProps {
  rootMessage: any;
  onBack: () => void;
}

export default function ThreadDetailView({
  rootMessage,
  onBack,
}: ThreadDetailViewProps) {
  const queryClient = useQueryClient();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const memberProfiles = useChatMemberProfiles();
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
      const res = await followThread(rootMessage.id);
      const following = res.data.following;
      setIsFollowing(following);
      toast.success(
        following ? "Đang theo dõi: nhận thông báo từ luồng này" : "Đã bỏ theo dõi luồng này"
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái theo dõi");
    }
  };

  // Fetch thread messages (root message + replies)
  const { data: threadData, isLoading } = useQuery({
    queryKey: ["threadMessages", rootMessage.id],
    queryFn: () => getThreadMessages(rootMessage.id),
    staleTime: 1000 * 30, // 30s
  });

  const replies = threadData?.data?.replies || [];

  // Listen to new replies via WebSockets
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.threadParentId === rootMessage.id) {
        queryClient.setQueryData(
          ["threadMessages", rootMessage.id],
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
  }, [rootMessage.id, queryClient]);

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
    if (!socket) return;

    socket.emit(ChatEvent.SEND_MESSAGE, {
      conversationId: rootMessage.conversationId,
      content,
      medias: media,
      threadParentId: rootMessage.id,
      mentions,
    });
  };

  const getProfile = (userId: string) => {
    return memberProfiles[userId] || null;
  };

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
        <h2 className="font-semibold text-gray-800">Thảo luận theo chủ đề</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFollow}
            className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer"
            title={isFollowing ? "Đang theo dõi luồng này" : "Theo dõi luồng này"}
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
              {getProfile(rootMessage.senderId)?.avatarUrl ? (
                <Image
                  src={getProfile(rootMessage.senderId)!.avatarUrl}
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
                    ? "Bạn"
                    : getProfile(rootMessage.senderId)?.fullName ||
                      "Người dùng"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatConversationTime(rootMessage.createdAt)}
                </span>
              </div>
              <div className="text-xs text-gray-800 break-words bg-gray-200 p-2.5 rounded-lg border border-gray-100">
                {rootMessage.content ? (
                  renderMessageContent(
                    rootMessage.content,
                    memberProfiles ?? undefined,
                  )
                ) : (
                  <span className="text-gray-400 italic">[Đính kèm]</span>
                )}
                {renderThreadMessageMedias(rootMessage)}
              </div>
            </div>
          </div>
          <div className="mt-2 pl-11 text-[10px] font-semibold text-gray-500">
            {replies.length} phản hồi
          </div>
        </div>

        {/* Loading / Replies */}
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-4">
            Đang tải bình luận...
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
                          ? "Bạn"
                          : profile?.fullName || "Người dùng"}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {formatConversationTime(reply.createdAt)}
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
