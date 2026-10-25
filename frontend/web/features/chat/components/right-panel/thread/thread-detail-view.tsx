import AiTypingIndicator from "../../message/ai-typing-indicator";
import { useAiTypingIndicator } from "../../../hooks/message/useAiTypingIndicator";
import { QueryFeedback } from "@/components/common/query-feedback";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { X, FileText, Download, Bell, Play } from "lucide-react";
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
import MediaLightbox from "../../message/media-lightbox";
import MessageAvatar from "../../message/message-avatar";
import { upsertMessageById } from "../../../utils/message-state-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";


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
          ? "Following thread notifications"
          : "Unfollowed thread",
      );
    } catch {
      setFollowOverride({
        threadId: rootMessage.id,
        isFollowing: !nextFollowingState,
      });
      toast.error("Failed to change follow status");
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
    if (activeChat && "members" in activeChat && Array.isArray(activeChat.members)) {
      activeChat.members.forEach((m: any) => {
        if (m.userId) ids.add(m.userId);
      });
    }
    return Array.from(ids);
  }, [replies, rootMessage.senderId, activeChat]);
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
          toast.error("Failed to send reply"),
        );
      return;
    }

    if (!rootChatId) return;
    if (!canReplyInThread) {
      toast.error("Only space administrators can reply in this thread.");
      return;
    }

    sendChannelMessage(rootChatId, {
        content,
        medias: media,
        threadParentId: rootMessage.id,
        mentions,
      })
      .then((response) => {
        if (response.data) {
          appendThreadReply(response.data);
          chatInputRef.current?.focus();
        }
      })
      .catch(() =>
        toast.error("Failed to send reply"),
      );
  };

  const getProfile = (userId: string) => {
    return memberProfiles[userId] || null;
  };
  const rootProfile =
    activeRootMessage.senderProfile || getProfile(activeRootMessage.senderId);
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
                  <Button variant="unstyled"
                    type="button"
                    key={media.id}
                    onClick={() => {
                      setLightboxMedias(visualMedias);
                      setLightboxIndex(index);
                    }}
                    className="cursor-pointer overflow-hidden rounded-control block border border-border text-left w-full focus:outline-none"
                  >
                    <img
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
                    <video
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
                  className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg border border-border bg-card hover:bg-background transition max-w-[240px]"
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
                  <a
                    href={media.fileUrl}
                    download={media.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition"
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
          <div className="flex items-start gap-3">
            <MessageAvatar
              showAvatar={true}
              senderName={rootProfile?.fullName || "User"}
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
                <span className="font-semibold text-xs text-foreground truncate">
                  {rootProfile?.fullName || "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(activeRootMessage.createdAt)}
                </span>
              </div>
              {activeRootMessage.type === "TASK" ||
              (activeRootMessage.content &&
                (activeRootMessage.content.includes("[Task #") ||
                  activeRootMessage.content.trim().startsWith('{"title":'))) ? (
                <TaskCardMessage
                  content={activeRootMessage.content || ""}
                  projectId={spaceDetail?.projectId}
                  className="max-w-full"
                />
              ) : (
                <div className="text-xs text-foreground break-words bg-muted p-3 rounded-panel border border-border">
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
          <div className="mt-2 pl-11 text-xs font-semibold text-muted-foreground">
            {`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </div>
        </div>

        {/* Loading / Replies */}
        {threadQuery.isError && replies.length > 0 && <QueryFeedback label="thread replies" error retrying={threadQuery.isFetching} onRetry={() => threadQuery.refetch()} />}
        {threadQuery.isError && replies.length === 0 ? <QueryFeedback label="thread replies" error retrying={threadQuery.isFetching} onRetry={() => threadQuery.refetch()} /> : isLoading ? (
          <div className="text-center text-xs text-muted-foreground py-4">
            Loading comments...
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply: any) => {
              const profile = reply.senderProfile || getProfile(reply.senderId);
              return (
                <div key={reply.id} className="flex items-start gap-3">
                  <MessageAvatar
                    showAvatar={true}
                    senderName={profile?.fullName || "User"}
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
                      <span className="font-semibold text-xs text-foreground truncate">
                        {profile?.fullName || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-foreground break-words bg-muted p-2 rounded-lg">
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
        <ThreadChatInput ref={chatInputRef} onSendMessage={handleSendReply} />
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
