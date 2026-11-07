import { AI_BOT, isAiBot } from "../../../constants/chat-identity";
import { cn } from "@/lib/utils";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { StorageVideo, StorageLink, StorageImg } from "@/components/common/storage-media";
import type { ChatMediaResponse } from "@/features/chat/types/chat.types";
import AiTypingIndicator from "../../message/ai-typing-indicator";
import { useAiTypingIndicator } from "../../../hooks/message/useAiTypingIndicator";
import { isPrivateChannel } from "@/features/chat/utils/channel-membership-permissions";
import { QueryFeedback } from "@/components/common/query-feedback";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { X, FileText, Download, Bell, Play } from "lucide-react";

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
  sendChannelMessage,
  getSpaceDetails,
} from "../../../api/chat.api";
import { socketService } from "../../../api/chat-socket.service";
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
import { SendSocketMessageMedia } from "../../../types/chat-socket.types";
import ThreadChatInput, {
  ThreadChatInputRef,
} from "../../input/thread-chat-input";
import { renderMessageContent } from "../../../utils/message-formatter";
import TaskCardMessage from "../../message/task-card-message";
import { isTaskCardMessage } from "../../../utils/task-card-message";
import MediaLightbox from "../../message/media-lightbox";
import MessageAvatar from "../../message/message-avatar";
import { upsertMessageById } from "../../../utils/message-state-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { CHAT_COMPOSER_MESSAGES } from "../../../constants/composer.constants";


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

  const isPrivate = activeChat && "spaceId" in activeChat && isPrivateChannel(activeChat);
  const spaceCreatorId = isPrivate ? activeChat.ownerId ?? null : spaceDetail?.createdBy || null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ThreadChatInputRef>(null);
  const [followOverride, setFollowOverride] = useState<{
    threadId: string;
    isFollowing: boolean;
  } | null>(null);
  const [lightboxMedias, setLightboxMedias] = useState<ChatMediaResponse[] | null>(null);
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
  const aiTyping = useAiTypingIndicator(
    rootChatId,
    isDirect ? ChatContextType.DIRECT_MESSAGE : ChatContextType.CHANNEL,
    rootMessage.id,
  );
  const currentMember = activeChat?.members?.find(
    (member) => member.userId === currentUserId,
  );
  const canReplyInThread =
    isDirect ||
    activeChatType !== ChatContextType.CHANNEL ||
    (isPrivate ? activeChat.ownerId === currentUserId : currentMember?.role !== "MEMBER") ||
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
          ? "Following thread notifications"
          : "Unfollowed thread",
      );
    } catch (permissionError) {
      setFollowOverride({
        threadId: rootMessage.id,
        isFollowing: !nextFollowingState,
      });
      toast.error(getActionErrorMessage(permissionError, "Failed to change follow status"));
    }
  };

  // Fetch thread messages (root message + replies)
  const threadQuery = useQuery({
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

  const { data: threadData, isLoading } = threadQuery;
  const activeRootMessage = threadData?.data?.rootMessage || rootMessage;
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

          return {
            success: oldData?.success ?? true,
            message: oldData?.message,
            data: {
              rootMessage: oldData?.data?.rootMessage ?? rootMessage,
              replies: upsertMessageById(currentReplies, reply),
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
      (oldThreads: FollowedThreadResponse[] | undefined) =>
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
  const memberProfiles = useChatMemberProfiles([...(rootMessage.mentions ?? []), ...replies.flatMap(reply => reply.mentions ?? [])], { resolveMissing: true });

  // Listen to new replies via WebSockets
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: ChatMessageResponse) => {
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

  const handleSendReply = async (
    content: string,
    media?: SendSocketMessageMedia[],
    mentions?: string[],
  ): Promise<boolean> => {
    if (isDirect) {
      if (!rootChatId) return false;

      const sentReply = await sendDirectThreadReply({
        conversationId: rootChatId,
        content,
        medias: media,
        threadParentId: rootMessage.id,
        mentions,
        onSent: () => {
          queryClient.invalidateQueries({
            queryKey: chatKeys.threadMessages(ChatScope.DIRECT, rootMessage.id),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.threads(ChatScope.DIRECT, rootChatId),
          });
        },
      });
      if (sentReply) {
        appendThreadReply(sentReply);
        return true;
      }
      return false;
    }

    if (!rootChatId) return false;
    if (!canReplyInThread) {
      toast.error("Only space administrators can reply in this thread.");
      return false;
    }

    try {
      const response = await sendChannelMessage(rootChatId, {
        content,
        medias: media,
        threadParentId: rootMessage.id,
        mentions,
      });
      if (response.data) {
        appendThreadReply(response.data);
        return true;
      }
      toast.error(CHAT_COMPOSER_MESSAGES.sendFailed);
      return false;
    } catch (error) {
      toast.error(getActionErrorMessage(error, "Failed to send reply"));
      return false;
    }
  };

  const getProfile = (userId: string) => {
    return memberProfiles[userId] || null;
  };
  const rootProfile =
    activeRootMessage.senderProfile || getProfile(activeRootMessage.senderId);

  const renderThreadMessageMedias = (messageItem: ChatMessageResponse) => {
    const own = messageItem.senderId === currentUserId;
    if (!messageItem.medias || messageItem.medias.length === 0) return null;

    const visualMedias = messageItem.medias.filter(
      (m) => m.type === "IMAGE" || m.type === "VIDEO",
    );
    const fileMedias = messageItem.medias.filter(
      (m) => m.type !== "IMAGE" && m.type !== "VIDEO",
    );

    return (
      <div className={cn("mt-2 flex min-w-0 max-w-full flex-col gap-2 text-left", own ? "items-end" : "items-start")}>
        {/* Render images/videos */}
        {visualMedias.length > 0 && (
          <div className="grid min-w-0 w-full max-w-[240px] grid-cols-1 gap-1">
            {visualMedias.map((media, index: number) => {
              if (media.type === "IMAGE") {
                return (
                  <Button variant="unstyled"
                    type="button"
                    key={media.id}
                    onClick={() => {
                      setLightboxMedias(visualMedias);
                      setLightboxIndex(index);
                    }}
                    className="cursor-pointer overflow-hidden rounded-control block border border-border text-left w-full focus:outline-none"
                  >
                    <StorageImg
                      src={media.fileUrl}
                      alt={media.name}
                      className="w-full max-h-[160px] object-cover hover:opacity-90 transition"
                    />
                  </Button>
                );
              } else {
                return (
                  <Button variant="unstyled"
                    type="button"
                    key={media.id}
                    onClick={() => {
                      setLightboxMedias(visualMedias);
                      setLightboxIndex(index);
                    }}
                    className="relative w-full rounded-control overflow-hidden border border-border bg-overlay/5 block text-left focus:outline-none cursor-pointer"
                  >
                    <StorageVideo
                      src={media.fileUrl}
                      className="w-full max-h-[160px] object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-overlay/10 hover:bg-overlay/25 transition">
                      <span className="w-8 h-8 bg-overlay/50 rounded-full flex items-center justify-center text-primary-foreground animate-in fade-in duration-150">
                        <Play
                          size={16}
                          fill="currentColor"
                          className="ml-0.5"
                        />
                      </span>
                    </span>
                  </Button>
                );
              }
            })}
          </div>
        )}

        {/* Render file attachments */}
        {fileMedias.length > 0 && (
          <div className="flex flex-col gap-1.5 max-w-full">
            {fileMedias.map((media) => {
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
                  className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg border border-border bg-card hover:bg-background transition min-w-0 w-full max-w-[240px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-info-soft text-info-content flex-shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate text-foreground">
                        {media.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatSize(media.sizeBytes)}
                      </span>
                    </div>
                  </div>
                  <StorageLink
                    href={media.fileUrl}
                    download={media.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition"
                  >
                    <Download size={14} />
                  </StorageLink>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-0 min-w-0 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">
          Thread Discussion
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="unstyled"
            onClick={handleToggleFollow}
            className="p-2 hover:bg-muted rounded-full transition cursor-pointer"
            title={
              isFollowing
                ? "Following this thread"
                : "Follow this thread"
            }
          >
            <Bell
              size={18}
              className={
                isFollowing ? "fill-info-content text-info-content" : "text-muted-foreground"
              }
            />
          </Button>
          <Button variant="unstyled" aria-label="Close"
            onClick={onBack}
            className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition animate-fade-in"
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* Message List area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
      >
        {/* Root parent message */}
        <div className="border-b border-border pb-4">
          <div className={cn("flex min-w-0 items-start gap-2.5", activeRootMessage.senderId === currentUserId && "flex-row-reverse")}>
            <MessageAvatar
              showAvatar={true}
              isBot={isAiBot(activeRootMessage.senderId, activeRootMessage.type)}
              senderName={isAiBot(activeRootMessage.senderId, activeRootMessage.type) ? AI_BOT.name : rootProfile?.fullName || "User"}
              senderProfile={rootProfile}
              memberRole={
                activeChat?.members?.find(
                  (m) => m.userId === rootMessage.senderId,
                )?.role
              }
              spaceCreatorId={spaceCreatorId}
              onClick={() => {
                if (rootMessage.senderId) {
                  dispatch(setSelectedProfileUserId(rootMessage.senderId));
                }
              }}
            />
            <div className={cn("flex min-w-0 max-w-[calc(100%-3rem)] flex-1 flex-col", activeRootMessage.senderId === currentUserId ? "items-end" : "items-start")}>
              <div className={cn("mb-1 flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5", activeRootMessage.senderId === currentUserId && "flex-row-reverse text-right")}>
                <span className="font-semibold text-xs text-foreground truncate">
                  {isAiBot(activeRootMessage.senderId, activeRootMessage.type) ? AI_BOT.name : rootProfile?.fullName || "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(activeRootMessage.createdAt)}
                </span>
              </div>
              {isTaskCardMessage(activeRootMessage) ? (
                <TaskCardMessage
                  content={activeRootMessage.content || ""}
                  projectId={spaceDetail?.projectId}
                  variant="thread"
                  className="max-w-full"
                />
              ) : (
                <div className="text-xs text-foreground text-left min-w-0 max-w-full [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto bg-muted p-3 rounded-panel border border-border">
                  {activeRootMessage.content ? (
                    renderMessageContent(
                      activeRootMessage.content,
                      memberProfiles ?? undefined,
                    )
                  ) : (
                    <span className="text-muted-foreground italic">
                      Attachment
                    </span>
                  )}
                  {renderThreadMessageMedias(activeRootMessage)}
                </div>
              )}
            </div>
          </div>
          <div className={cn("mt-2 text-xs font-semibold text-muted-foreground", activeRootMessage.senderId === currentUserId ? "pr-11 text-right" : "pl-11")}>
            {`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </div>
        </div>

        {/* Loading / Replies */}
        {threadQuery.isError && replies.length > 0 && <QueryFeedback label="thread replies" error retrying={threadQuery.isFetching} onRetry={() => threadQuery.refetch()} />}
        {threadQuery.isError && replies.length === 0 ? <QueryFeedback label="thread replies" error retrying={threadQuery.isFetching} onRetry={() => threadQuery.refetch()} /> : isLoading ? (
          <LoadingState label="Loading comments..." layout="centered" className="text-center text-xs text-muted-foreground py-4" />
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => {
              const profile = reply.senderProfile || getProfile(reply.senderId);
              const own = reply.senderId === currentUserId;
              const bot = isAiBot(reply.senderId, reply.type);
              return (
                <div key={reply.id} className={cn("flex min-w-0 items-start gap-2.5", own && "flex-row-reverse")}>
                  <MessageAvatar
                    showAvatar={true}
                    isBot={bot}
                    senderName={bot ? AI_BOT.name : profile?.fullName || "User"}
                    senderProfile={profile}
                    memberRole={
                      activeChat?.members?.find(
                        (m) => m.userId === reply.senderId,
                      )?.role
                    }
                    spaceCreatorId={spaceCreatorId}
                    onClick={() => {
                      if (reply.senderId) {
                        dispatch(setSelectedProfileUserId(reply.senderId));
                      }
                    }}
                  />
                  <div className={cn("flex min-w-0 max-w-[calc(100%-3rem)] flex-1 flex-col", own ? "items-end" : "items-start")}>
                    <div className={cn("mb-0.5 flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5", own && "flex-row-reverse text-right")}>
                      <span className="font-semibold text-xs text-foreground truncate">
                        {bot ? AI_BOT.name : profile?.fullName || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-foreground text-left min-w-0 max-w-full break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto bg-muted p-2 rounded-lg">
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

      <AiTypingIndicator active={aiTyping} />

      {/* Input bar */}
      {canReplyInThread ? (
        <ThreadChatInput key={`${rootChatId}:${rootMessage.id}`} ref={chatInputRef} threadId={rootMessage.id} onSendMessage={handleSendReply} />
      ) : (
        <div className="w-full border-t border-border bg-card p-3">
          <div className="flex items-center justify-center rounded-panel border border-border bg-background p-3 text-sm text-muted-foreground">
            Only space administrators can reply in this thread.
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
