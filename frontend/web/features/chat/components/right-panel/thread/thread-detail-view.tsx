import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { X, User, FileText, Download, Bell, Play } from "lucide-react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  followDirectThread,
  followThread,
  getFollowedChannelThreads,
  getFollowedDirectThreads,
  markChannelThreadAsRead,
  markDirectThreadAsRead,
  unfollowDirectThread,
  unfollowThread,
  getDirectThreadMessages,
  getThreadMessages,
  getSpaceDetails,
} from "../../../api/chat.api";
import { socketService } from "@/infrastructure/realtime/communication-socket.client";
import { ChatEvent } from "../../../api/chat.events";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { useDirectMessageActions } from "../../../hooks/useDirectMessageActions";
import { useActiveChat } from "../../../hooks/useChatQueries";
import { formatDateTime } from "@/lib/date";
import { ChatScope, chatKeys } from "../../../types/chat.constant";
import {
  ChatContextType,
  ApiResponse,
  ChatMessageResponse,
  FollowedThreadResponse,
  ThreadMessagesResponse,
} from "../../../types/chat.types";
import {
  ChatSocketAckResponse,
  SendSocketMessageMedia,
} from "../../../types/chat-socket.types";
import ThreadChatInput, {
  ThreadChatInputRef,
} from "../../input/thread-chat-input";
import { renderMessageContent } from "../../../utils/message-formatter";
import MediaLightbox from "../../message/media-lightbox";
import MessageAvatar from "../../message/message-avatar";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ThreadDetailViewProps {
  rootMessage: ChatMessageResponse;
  isDirect?: boolean;
  onBack: () => void;
}

const EMPTY_FOLLOWED_THREADS: FollowedThreadResponse[] = [];

async function fetchFollowedThreadsForState() {
  const [channelThreadsResponse, directThreadsResponse] = await Promise.all([
    getFollowedChannelThreads(),
    getFollowedDirectThreads(),
  ]);

  const channelThreads = channelThreadsResponse.success
    ? channelThreadsResponse.data
    : EMPTY_FOLLOWED_THREADS;
  const directThreads = directThreadsResponse.success
    ? directThreadsResponse.data
    : EMPTY_FOLLOWED_THREADS;

  return [...channelThreads, ...directThreads];
}

function hasCurrentUserFollower(
  message: ChatMessageResponse,
  currentUserId?: string | null,
) {
  if (!currentUserId) return false;

  return (
    message.threadFollowers?.some((threadFollower) =>
      typeof threadFollower === "string"
        ? threadFollower === currentUserId
        : threadFollower.userId === currentUserId,
    ) || false
  );
}

export default function ThreadDetailView({
  rootMessage,
  isDirect = false,
  onBack,
}: ThreadDetailViewProps) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { sendMessage: sendDirectThreadReply } = useDirectMessageActions();
  const { activeChat, activeChatType } = useActiveChat();
  const currentUserId = useAppSelector((state) => state.auth.userId);

  const spaceId =
    activeChat && "spaceId" in activeChat ? activeChat.spaceId : undefined;

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(spaceId || ""),
    queryFn: async () => (await getSpaceDetails(spaceId!)).data,
    enabled: !!spaceId,
  });

  const spaceCreatorId = spaceDetail?.createdBy || null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ThreadChatInputRef>(null);
  const [followOverride, setFollowOverride] = useState<{
    threadId: string;
    isFollowing: boolean;
  } | null>(null);
  const [lightboxMedias, setLightboxMedias] = useState<any[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const { data: followedThreads = EMPTY_FOLLOWED_THREADS } = useQuery({
    queryKey: chatKeys.followedThreads(currentUserId),
    queryFn: fetchFollowedThreadsForState,
    enabled: !!currentUserId,
    staleTime: 1000 * 30,
  });
  const computedIsFollowing = useMemo(() => {
    const followedThread = followedThreads.find(
      (thread) => thread.rootMessage.id === rootMessage.id,
    );

    if (followedThread) {
      return followedThread.isFollowing;
    }

    return hasCurrentUserFollower(rootMessage, currentUserId);
  }, [currentUserId, followedThreads, rootMessage]);

  const isFollowing =
    followOverride?.threadId === rootMessage.id
      ? followOverride.isFollowing
      : computedIsFollowing;
  const rootChatId = useMemo(() => {
    const chatId = rootMessage.chatId;
    return (
      rootMessage.conversationId ??
      rootMessage.channelId ??
      (typeof chatId === "string" ? chatId : null)
    );
  }, [rootMessage]);
  const currentMember = activeChat?.members?.find(
    (member) => member.userId === currentUserId,
  );
  const canReplyInThread =
    isDirect ||
    activeChatType !== ChatContextType.CHANNEL ||
    currentMember?.role !== "MEMBER" ||
    activeChat?.setting?.allowSendMessage !== false;

  const handleToggleFollow = async () => {
    const nextFollowingState = !isFollowing;
    setFollowOverride({
      threadId: rootMessage.id,
      isFollowing: nextFollowingState,
    });

    try {
      const res = isDirect
        ? isFollowing
          ? await unfollowDirectThread(rootMessage.id)
          : await followDirectThread(rootMessage.id)
        : isFollowing
          ? await unfollowThread(rootMessage.id)
          : await followThread(rootMessage.id);
      const following = res.data.following;
      setFollowOverride({
        threadId: rootMessage.id,
        isFollowing: following,
      });
      queryClient.setQueryData<FollowedThreadResponse[]>(
        chatKeys.followedThreads(currentUserId),
        (oldThreads) => {
          if (!Array.isArray(oldThreads)) return oldThreads;

          if (!following) {
            return oldThreads.filter(
              (thread) => thread.rootMessage.id !== rootMessage.id,
            );
          }

          return oldThreads.map((thread) =>
            thread.rootMessage.id === rootMessage.id
              ? { ...thread, isFollowing: true }
              : thread,
          );
        },
      );
      queryClient.invalidateQueries({
        queryKey: chatKeys.followedThreads(currentUserId),
      });
      toast.success(
        following
          ? intl.formatMessage({ id: "chat.followingThreadNotifications" })
          : intl.formatMessage({ id: "chat.unfollowedThread" }),
      );
    } catch {
      setFollowOverride({
        threadId: rootMessage.id,
        isFollowing: !nextFollowingState,
      });
      toast.error(intl.formatMessage({ id: "chat.failedChangeFollowStatus" }));
    }
  };

  // Fetch thread messages (root message + replies)
  const { data: threadData, isLoading } = useQuery({
    queryKey: chatKeys.threadMessages(
      isDirect ? ChatScope.DIRECT : ChatScope.CHANNEL,
      rootMessage.id,
    ),
    queryFn: () =>
      isDirect
        ? getDirectThreadMessages(rootMessage.id)
        : getThreadMessages(rootMessage.id),
    staleTime: 1000 * 30, // 30s
  });

  const replies = threadData?.data?.replies || [];

  const appendThreadReply = useCallback(
    (reply: ChatMessageResponse) => {
      queryClient.setQueryData<ApiResponse<ThreadMessagesResponse>>(
        chatKeys.threadMessages(
          isDirect ? ChatScope.DIRECT : ChatScope.CHANNEL,
          rootMessage.id,
        ),
        (oldData) => {
          const currentReplies = oldData?.data?.replies || [];
          if (currentReplies.some((item) => item.id === reply.id)) {
            return oldData;
          }

          return {
            success: oldData?.success ?? true,
            message: oldData?.message,
            data: {
              rootMessage: oldData?.data?.rootMessage ?? rootMessage,
              replies: [...currentReplies, reply],
            },
          };
        },
      );
    },
    [isDirect, queryClient, rootMessage],
  );

  useEffect(() => {
    if (!isFollowing) return;

    queryClient.setQueryData(
      chatKeys.followedThreads(currentUserId),
      (oldThreads: any) =>
        Array.isArray(oldThreads)
          ? oldThreads.map((thread) =>
              thread.rootMessage.id === rootMessage.id
                ? { ...thread, unreadReplyCount: 0 }
                : thread,
            )
          : oldThreads,
    );

    void (
      isDirect
        ? markDirectThreadAsRead(rootMessage.id)
        : markChannelThreadAsRead(rootMessage.id)
    ).finally(() => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.followedThreads(currentUserId),
      });
    });
  }, [currentUserId, isDirect, isFollowing, queryClient, rootMessage.id]);
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
        appendThreadReply(msg);
        if (isFollowing) {
          void (
            isDirect
              ? markDirectThreadAsRead(rootMessage.id)
              : markChannelThreadAsRead(rootMessage.id)
          ).finally(() => {
            queryClient.invalidateQueries({
              queryKey: chatKeys.followedThreads(currentUserId),
            });
          });
        }
      }
    };

    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
    };
  }, [
    appendThreadReply,
    currentUserId,
    isDirect,
    isFollowing,
    queryClient,
    rootMessage.id,
  ]);

  // Scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  // Focus input when the thread details view opens or the active thread message changes
  useEffect(() => {
    if (!canReplyInThread) return;
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
    const timer = setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [canReplyInThread, rootMessage.id]);

  const handleSendReply = (
    content: string,
    media?: SendSocketMessageMedia[],
    mentions?: string[],
  ) => {
    const socket = socketService.getSocket();

    if (isDirect) {
      if (!rootChatId) return;

      sendDirectThreadReply({
        conversationId: rootChatId,
        content,
        medias: media,
        threadParentId: rootMessage.id,
        onSent: () => {
          queryClient.invalidateQueries({
            queryKey: chatKeys.threadMessages(ChatScope.DIRECT, rootMessage.id),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.threads(ChatScope.DIRECT, rootChatId),
          });
        },
      })
        .then((sentReply) => {
          if (sentReply) {
            appendThreadReply(sentReply);
            chatInputRef.current?.focus();
          }
        })
        .catch(() =>
          toast.error(intl.formatMessage({ id: "chat.failedSendReply" })),
        );
      return;
    }

    if (!socket || !rootChatId) return;
    if (!canReplyInThread) {
      toast.error(intl.formatMessage({ id: "chat.onlyAdminsCanReplyThread" }));
      return;
    }

    socket.emit(
      ChatEvent.SEND_MESSAGE,
      {
        channelId: rootChatId,
        chatId: rootChatId,
        chatType: ChatContextType.CHANNEL,
        content,
        medias: media,
        threadParentId: rootMessage.id,
        mentions,
      },
      (response: ChatSocketAckResponse<ChatMessageResponse>) => {
        if (response?.status === "success" && response.data) {
          appendThreadReply(response.data);
          chatInputRef.current?.focus();
          return;
        }

        toast.error(
          response?.message ||
            intl.formatMessage({ id: "chat.failedSendReply" }),
        );
      },
    );
  };

  const getProfile = (userId: string) => {
    return memberProfiles[userId] || null;
  };
  const rootProfile =
    rootMessage.senderProfile || getProfile(rootMessage.senderId);
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
            {visualMedias.map((media: any, index: number) => {
              if (media.type === "IMAGE") {
                return (
                  <button
                    type="button"
                    key={media.id}
                    onClick={() => {
                      setLightboxMedias(visualMedias);
                      setLightboxIndex(index);
                    }}
                    className="cursor-pointer overflow-hidden rounded-lg block border border-gray-100 shadow-sm text-left w-full focus:outline-none"
                  >
                    <img
                      src={media.fileUrl}
                      alt={media.name}
                      className="w-full max-h-[160px] object-cover hover:opacity-90 transition"
                    />
                  </button>
                );
              } else {
                return (
                  <button
                    type="button"
                    key={media.id}
                    onClick={() => {
                      setLightboxMedias(visualMedias);
                      setLightboxIndex(index);
                    }}
                    className="relative w-full rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-black/5 block text-left focus:outline-none cursor-pointer"
                  >
                    <video
                      src={media.fileUrl}
                      className="w-full max-h-[160px] object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition">
                      <span className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-lg animate-in fade-in duration-150">
                        <Play
                          size={16}
                          fill="currentColor"
                          className="ml-0.5"
                        />
                      </span>
                    </span>
                  </button>
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
        <h2 className="font-semibold text-gray-800">
          {intl.formatMessage({ id: "chat.threadDiscussion" })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFollow}
            className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer"
            title={
              isFollowing
                ? intl.formatMessage({ id: "chat.followingThisThread" })
                : intl.formatMessage({ id: "chat.followThisThread" })
            }
          >
            <Bell
              size={18}
              className={
                isFollowing ? "fill-blue-500 text-blue-500" : "text-gray-400"
              }
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
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
      >
        {/* Root parent message */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            <MessageAvatar
              showAvatar={true}
              senderName={rootProfile?.fullName || intl.formatMessage({ id: "app.user" })}
              senderProfile={rootProfile}
              memberRole={
                activeChat?.members?.find(
                  (m: any) => m.userId === rootMessage.senderId,
                )?.role
              }
              spaceCreatorId={spaceCreatorId}
              onClick={() => {
                if (rootMessage.senderId) {
                  dispatch(setSelectedProfileUserId(rootMessage.senderId));
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-bold text-xs text-gray-900 truncate">
                  {rootProfile?.fullName || intl.formatMessage({ id: "app.user" })}
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
                  <span className="text-gray-400 italic">
                    {intl.formatMessage({ id: "chat.attachment" })}
                  </span>
                )}
                {renderThreadMessageMedias(rootMessage)}
              </div>
            </div>
          </div>
          <div className="mt-2 pl-11 text-[10px] font-semibold text-gray-500">
            {intl.formatMessage(
              { id: "chat.repliesCount" },
              { count: replies.length },
            )}
          </div>
        </div>

        {/* Loading / Replies */}
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-4">
            {intl.formatMessage({ id: "chat.loadingComments" })}
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply: any) => {
              const profile = reply.senderProfile || getProfile(reply.senderId);
              return (
                <div key={reply.id} className="flex items-start gap-3">
                  <MessageAvatar
                    showAvatar={true}
                    senderName={profile?.fullName || intl.formatMessage({ id: "app.user" })}
                    senderProfile={profile}
                    memberRole={
                      activeChat?.members?.find(
                        (m: any) => m.userId === reply.senderId,
                      )?.role
                    }
                    spaceCreatorId={spaceCreatorId}
                    onClick={() => {
                      if (reply.senderId) {
                        dispatch(setSelectedProfileUserId(reply.senderId));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="font-bold text-xs text-gray-700 truncate">
                        {profile?.fullName || intl.formatMessage({ id: "app.user" })}
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
      {canReplyInThread ? (
        <ThreadChatInput ref={chatInputRef} onSendMessage={handleSendReply} />
      ) : (
        <div className="w-full border-t border-gray-200 bg-white p-3">
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
            {intl.formatMessage({ id: "chat.onlyAdminsCanReplyThread" })}
          </div>
        </div>
      )}
      {lightboxMedias && lightboxMedias.length > 0 && (
        <MediaLightbox
          medias={lightboxMedias}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxMedias(null)}
        />
      )}
    </div>
  );
}
