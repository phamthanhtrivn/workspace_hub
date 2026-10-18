"use client";

import { useState, useEffect, useRef } from "react";
import { socketService } from "../../../api/chat-socket.service";
import { ChatEvent } from "../../../api/chat.events";
import {
  getDirectConversationMedia,
  muteDirectConversation,
  pinDirectConversation,
} from "../../../api/chat.api";
import MediaLightbox from "../../message/media-lightbox";
import FilesSection from "../files/files-section";
import PinnedMessagesSection from "../pinned-messages/pinned-messages-section";
import ThreadsSection from "../thread/threads-section";
import PinnedMessagesDetailView from "../pinned-messages/pinned-messages-detail-view";
import SearchMessagesSection from "../search/search-messages-section";
import ThreadsListView from "../thread/threads-list-view";
import { X, Bell, BellOff, Pin, User } from "lucide-react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setSelectedProfileUserId,
  updateMuteStatus,
  updatePinStatus,
  setActiveThreadRootMessage,
  setHighlightMessageId,
} from "@/store/chat/chat-slice";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { ChatQueryKey } from "../../../types/chat.constant";

import { useActiveChat } from "../../../hooks/useChatQueries";
import { logApiError } from "@/lib/interceptors";
import MediaDetailView from "../files/media-detail-view";
import { Button } from "@/components/ui/button";


interface DirectMessageRightPanelProps {
  onClose: () => void;
  initialDetailView?: "files" | "polls" | "search" | "threads" | null;
}

function getMessageChatId(message: any) {
  return (
    message?.chatId ?? message?.channelId ?? message?.conversationId ?? null
  );
}

export default function DirectMessageRightPanel({
  onClose,
  initialDetailView,
}: DirectMessageRightPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "pinned",
  );
  const [detailView, setDetailView] = useState<
    "files" | "polls" | "search" | "threads" | "pinned" | null
  >(initialDetailView || null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const lastFetchedChatId = useRef<string | null>(null);

  const { activeChat: activeConversation } = useActiveChat();
  const memberProfiles = useChatMemberProfiles();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialDetailView !== undefined) {
      setDetailView(initialDetailView);
    }
  }, [initialDetailView]);

  const currentMember = activeConversation?.members?.find(
    (m: any) => m.userId === currentUserId,
  );

  useEffect(() => {
    setIsMuted(currentMember?.muted || false);
  }, [currentMember]);

  const isPinned = currentMember?.pinned || false;

  const updateDirectConversationMemberCache = (
    conversationId: string,
    memberPatch: { muted?: boolean; pinned?: boolean },
  ) => {
    queryClient.setQueriesData(
      { queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS] },
      (oldData: any) => {
        if (!oldData?.conversations) return oldData;
        return {
          ...oldData,
          conversations: oldData.conversations
            .map((conversation: any) => {
              if (conversation.id !== conversationId) return conversation;
              return {
                ...conversation,
                members: conversation.members?.map((member: any) =>
                  member.userId === currentUserId
                    ? { ...member, ...memberPatch }
                    : member,
                ),
              };
            })
            .sort((a: any, b: any) => {
              const aPinned = a.members?.find(
                (member: any) => member.userId === currentUserId,
              )?.pinned;
              const bPinned = b.members?.find(
                (member: any) => member.userId === currentUserId,
              )?.pinned;
              if (aPinned !== bPinned) return aPinned ? -1 : 1;
              return (
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
              );
            }),
        };
      },
    );
  };

  const handleToggleMute = async () => {
    if (!activeConversation || !currentUserId) return;
    const targetMuted = !isMuted;
    setIsMuted(targetMuted);

    try {
      await muteDirectConversation(activeConversation.id, targetMuted);
      dispatch(
        updateMuteStatus({
          conversationId: activeConversation.id,
          userId: currentUserId,
          muted: targetMuted,
        }),
      );
      updateDirectConversationMemberCache(activeConversation.id, {
        muted: targetMuted,
      });
    } catch (error) {
      setIsMuted(isMuted);
      console.error("Failed to update mute status:", error);
    }
  };

  const handleTogglePin = async () => {
    if (!activeConversation || !currentUserId) return;
    const targetPinned = !isPinned;

    dispatch(
      updatePinStatus({
        conversationId: activeConversation.id,
        userId: currentUserId,
        pinned: targetPinned,
      }),
    );
    updateDirectConversationMemberCache(activeConversation.id, {
      pinned: targetPinned,
    });

    try {
      await pinDirectConversation(activeConversation.id, targetPinned);
      queryClient.invalidateQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
      });
    } catch (error) {
      dispatch(
        updatePinStatus({
          conversationId: activeConversation.id,
          userId: currentUserId,
          pinned: isPinned,
        }),
      );
      updateDirectConversationMemberCache(activeConversation.id, {
        pinned: isPinned,
      });
      console.error("Failed to update pin status:", error);
    }
  };

  let displayName = "Direct Message";
  let displayAvatarUrl = null;
  let displayDescription = "";
  let otherMemberId: string | null = null;

  const otherMember = activeConversation?.members?.find(
    (m) => m.userId !== currentUserId,
  );
  if (otherMember) {
    otherMemberId = otherMember.userId;
    const profile = otherMember.profile || memberProfiles?.[otherMember.userId];
    displayName =
      profile?.fullName ||
      profile?.email ||
      otherMember.userId ||
      "User";
    displayAvatarUrl = profile?.avatarUrl || null;
    displayDescription = profile?.email || "";
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleJumpToMessage = (messageId: string) => {
    dispatch(setHighlightMessageId(messageId));
    setDetailView(null);
    onClose();
  };

  const handleOpenThread = (message: any) => {
    if (getMessageChatId(message) !== activeConversation?.id) return;
    dispatch(setActiveThreadRootMessage(message));
  };

  useEffect(() => {
    if (
      activeConversation?.id &&
      expandedSection === "files" &&
      lastFetchedChatId.current !== activeConversation.id
    ) {
      getDirectConversationMedia(activeConversation.id)
        .then((res: any) => {
          if (res.data && res.data.medias) {
            setMediaItems(res.data.medias);
            lastFetchedChatId.current = activeConversation.id;
          }
        })
        .catch((err: unknown) =>
          logApiError(err, "Failed to fetch direct message media"),
        );
    }
  }, [activeConversation?.id, expandedSection]);

  useEffect(() => {
    if (
      activeConversation?.id &&
      lastFetchedChatId.current !== activeConversation.id
    ) {
      setMediaItems([]);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      const getEventChannelId = (payload: any) =>
        payload?.channelId ?? payload?.conversationId;

      const handleMediaUpdated = (data: any) => {
        if (getEventChannelId(data) === activeConversation?.id && data.media) {
          setMediaItems((prev) => [...data.media, ...prev]);
        }
      };

      socket.on(ChatEvent.MEDIA_UPDATED, handleMediaUpdated);
      return () => {
        socket.off(ChatEvent.MEDIA_UPDATED, handleMediaUpdated);
      };
    }
  }, [activeConversation]);

  if (detailView === "files") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <MediaDetailView
          conversationId={activeConversation!.id}
          isDirect={true}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "pinned") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PinnedMessagesDetailView
          conversationId={activeConversation!.id}
          isDirect={true}
          onBack={() => setDetailView(null)}
          onJumpToMessage={handleJumpToMessage}
        />
      </div>
    );
  }

  if (detailView === "search") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <SearchMessagesSection
          conversationId={activeConversation!.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "threads") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <ThreadsListView
          conversationId={activeConversation!.id}
          isDirect={true}
          onClose={() => setDetailView(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 min-w-0 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">
          Details
        </h2>
        <Button variant="unstyled" aria-label="Close"
          onClick={onClose}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <X size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col items-center border-b border-border">
          <div
            className="w-20 h-20 bg-muted rounded-full flex items-center justify-center font-semibold text-3xl mb-3 overflow-hidden cursor-pointer"
            onClick={() => {
              if (otherMemberId) {
                dispatch(setSelectedProfileUserId(otherMemberId));
              }
            }}
          >
            {displayAvatarUrl ? (
              <Image
                src={displayAvatarUrl}
                alt="Avatar"
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <User size={40} className="text-muted-foreground" />
            )}
          </div>
          <h3 className="font-semibold text-foreground text-section-title">{displayName}</h3>
          <p className="text-sm text-muted-foreground mb-4">{displayDescription}</p>

          <div className="flex gap-4">
            <Button variant="unstyled"
              onClick={handleTogglePin}
              className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition"
            >
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Pin
                  size={18}
                  className={isPinned ? "fill-info-content text-info-content" : ""}
                />
              </div>
              <span className="text-xs font-medium">
                {isPinned ? "Unpin" : "Pin"}
              </span>
            </Button>

            <Button variant="unstyled"
              onClick={handleToggleMute}
              className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition"
            >
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
              </div>
              <span className="text-xs font-medium">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </Button>
          </div>
        </div>

        {/* Accordions */}
        <div className="py-2">
          <PinnedMessagesSection
            conversationId={activeConversation!.id}
            isDirect={true}
            isExpanded={expandedSection === "pinned"}
            onToggle={() => toggleSection("pinned")}
            onSeeAll={() => setDetailView("pinned")}
            onJumpToMessage={handleJumpToMessage}
          />

          <ThreadsSection
            conversationId={activeConversation!.id}
            isDirect={true}
            isExpanded={expandedSection === "threads"}
            onToggle={() => toggleSection("threads")}
            onSeeAll={() => setDetailView("threads")}
            onOpenThread={handleOpenThread}
          />

          <FilesSection
            isExpanded={expandedSection === "files"}
            onToggle={() => toggleSection("files")}
            files={mediaItems}
            onOpenPreview={(mediaId) => {
              const visualItems = mediaItems.filter(
                (m) =>
                  m.mimeType?.startsWith("image/") ||
                  m.mimeType?.startsWith("video/"),
              );
              setLightboxIndex(
                visualItems.findIndex((item) => item.id === mediaId),
              );
            }}
            onSeeAll={() => setDetailView("files")}
          />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <MediaLightbox
          medias={mediaItems.filter(
            (m) =>
              m.mimeType?.startsWith("image/") ||
              m.mimeType?.startsWith("video/"),
          )}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  );
}
