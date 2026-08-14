"use client";

import { useState, useEffect, useRef } from "react";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import {
  getChannelMedia,
  getDirectConversationMedia,
  muteChannel,
  muteDirectConversation,
  pinDirectConversation,
} from "../../api/chat.api";
import MediaLightbox from "../message/media-lightbox";
import ChannelSettingsSection from "./channel-settings-section";
import FilesSection from "./files-section";
import PollsSection from "./polls-section";
import NotesSection from "./notes-section";
import TasksSection from "./tasks-section";
import PinnedMessagesSection from "./pinned-messages-section";
import ThreadsSection from "./threads-section";
import MediaDetailView from "./media-detail-view";
import PollDetailView from "./poll-detail-view";
import PinnedMessagesDetailView from "./pinned-messages-detail-view";
import SearchMessagesSection from "./search-messages-section";
import ChannelSettingsModal from "../modals/channel-settings-modal";
import ThreadsListView from "./threads-list-view";
import {
  X,
  Bell,
  BellOff,
  Pin,
  User,
} from "lucide-react";
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
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { ChatQueryKey } from "../../types/chat.constant";
import { ChannelResponse, ChatContextType } from "../../types/chat.types";
import {
  useActiveChat,
} from "../../hooks/useChatQueries";
import { logApiError } from "@/lib/interceptors";

interface ChatRightPanelProps {
  onClose: () => void;
  initialDetailView?: "files" | "polls" | "search" | "threads" | null;
}

function getMessageChatId(message: any) {
  return message?.chatId ?? message?.channelId ?? message?.conversationId ?? null;
}

export default function ChatRightPanel({
  onClose,
  initialDetailView,
}: ChatRightPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "pinned",
  );
  const [detailView, setDetailView] = useState<
    | "files"
    | "polls"
    | "search"
    | "threads"
    | "pinned"
    | null
  >(initialDetailView || null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const lastFetchedChatId = useRef<string | null>(null);

  const { activeChat: activeConversation, activeChatType } = useActiveChat();
  const memberProfiles = useChatMemberProfiles();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialDetailView !== undefined) {
      setDetailView(initialDetailView);
    }
  }, [initialDetailView]);

  const isDirect = activeChatType === ChatContextType.DIRECT_MESSAGE;
  const activeChannel: ChannelResponse | null =
    !isDirect && activeConversation && "spaceId" in activeConversation
      ? activeConversation
      : null;

  let displayName = "Channel";
  let displayAvatarUrl = null;
  let displayDescription = `${activeConversation?.members?.length || 0} members`;
  let otherMemberId: string | null = null;
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
      await (isDirect ? muteDirectConversation : muteChannel)(
        activeConversation.id,
        targetMuted,
      );
      dispatch(
        updateMuteStatus({
          conversationId: activeConversation.id,
          userId: currentUserId,
          muted: targetMuted,
        }),
      );

      if (isDirect) {
        updateDirectConversationMemberCache(activeConversation.id, {
          muted: targetMuted,
        });
      }
    } catch (error) {
      setIsMuted(isMuted);
      console.error("Failed to update mute status:", error);
    }
  };

  const handleTogglePin = async () => {
    if (!activeConversation || !currentUserId || !isDirect) return;
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
  if (isDirect) {
    const otherMember = activeConversation?.members?.find(
      (m) => m.userId !== currentUserId,
    );
    if (otherMember) {
      otherMemberId = otherMember.userId;
      const profile = memberProfiles?.[otherMember.userId];
      const memberProfile = otherMember as any;
      displayName =
        profile?.fullName ||
        memberProfile.profile?.fullName ||
        memberProfile.fullName ||
        "User";
      displayAvatarUrl =
        profile?.avatarUrl ||
        memberProfile.profile?.avatarUrl ||
        memberProfile.avatarUrl ||
        null;
      displayDescription =
        profile?.email ||
        memberProfile.profile?.email ||
        memberProfile.email ||
        "";
    }
  } else if (activeConversation) {
    displayName = activeConversation.name || "Channel";
    displayAvatarUrl = activeConversation.avatarUrl;
  }

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
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
      const fetchMedia =
        isDirect
          ? getDirectConversationMedia
          : getChannelMedia;
      fetchMedia(activeConversation.id)
        .then((res: any) => {
          if (res.data && res.data.medias) {
            setMediaItems(res.data.medias);
            lastFetchedChatId.current = activeConversation.id;
          }
        })
        .catch((err: unknown) =>
          logApiError(
            err,
            isDirect
              ? "Failed to fetch direct message media"
              : "Failed to fetch channel media",
          ),
        );
    }
  }, [activeConversation?.id, expandedSection]);

  // Reset fetch tracker when chat changes so it can fetch again if expanded
  useEffect(() => {
    if (
      activeConversation?.id &&
      lastFetchedChatId.current !== activeConversation.id
    ) {
      // We don't fetch yet, but we clear mediaItems to avoid showing old ones
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

      const handleMemberJoin = (data: any) => {
        if (
          activeConversation &&
          getEventChannelId(data) === activeConversation.id &&
          data.member &&
          data.profile
        ) {
          const isAlreadyMember = activeConversation.members?.some(
            (m) => m.userId === data.member.userId,
          );
          if (!isAlreadyMember) {
            queryClient.invalidateQueries({ queryKey: ["channels"] });
          }
        }
      };

      socket.on(ChatEvent.MEDIA_UPDATED, handleMediaUpdated);
      socket.on(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);

      return () => {
        socket.off(ChatEvent.MEDIA_UPDATED, handleMediaUpdated);
        socket.off(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
      };
    }
  }, [activeConversation, dispatch]);

  const effectiveDetailView = detailView;

  if (effectiveDetailView === "files") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <MediaDetailView
          conversationId={activeConversation!.id}
          isDirect={isDirect}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (effectiveDetailView === "polls" && !isDirect) {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PollDetailView
          conversationId={activeConversation!.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (effectiveDetailView === "pinned") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PinnedMessagesDetailView
          conversationId={activeConversation!.id}
          isDirect={isDirect}
          onBack={() => setDetailView(null)}
          onJumpToMessage={handleJumpToMessage}
        />
      </div>
    );
  }

  if (effectiveDetailView === "search") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <SearchMessagesSection
          conversationId={activeConversation!.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (effectiveDetailView === "threads") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <ThreadsListView
          conversationId={activeConversation!.id}
          isDirect={isDirect}
          onClose={() => setDetailView(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Details</h2>
        <button
          onClick={onClose}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isDirect && (
          <div className="p-6 flex flex-col items-center border-b border-gray-100">
            <div
              className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-bold text-3xl mb-3 shadow-sm overflow-hidden cursor-pointer"
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
                <User size={40} className="text-gray-400" />
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
            <p className="text-sm text-gray-500 mb-4">{displayDescription}</p>

            <div className="flex gap-4">
              <button
                onClick={handleTogglePin}
                className="cursor-pointer flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 transition"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Pin
                    size={18}
                    className={isPinned ? "fill-blue-600 text-blue-600" : ""}
                  />
                </div>
                <span className="text-xs font-medium">
                  {isPinned ? "Unpin" : "Pin"}
                </span>
              </button>

              <button
                onClick={handleToggleMute}
                className="cursor-pointer flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 transition"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                </div>
                <span className="text-xs font-medium">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Accordions */}
        <div className="py-2">
          {activeChannel && (
            <ChannelSettingsSection
              activeChannel={activeChannel}
              currentUserId={currentUserId}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
          )}

          <PinnedMessagesSection
            conversationId={activeConversation!.id}
            isDirect={isDirect}
            isExpanded={expandedSection === "pinned"}
            onToggle={() => toggleSection("pinned")}
            onSeeAll={() => setDetailView("pinned")}
            onJumpToMessage={handleJumpToMessage}
          />

          {isDirect && (
            <ThreadsSection
              conversationId={activeConversation!.id}
              isDirect={isDirect}
              isExpanded={expandedSection === "threads"}
              onToggle={() => toggleSection("threads")}
              onSeeAll={() => setDetailView("threads")}
              onOpenThread={handleOpenThread}
            />
          )}

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
              setLightboxIndex(visualItems.findIndex((item) => item.id === mediaId));
            }}
            onSeeAll={() => setDetailView("files")}
          />

          {!isDirect && (
            <>
              <PollsSection
                isExpanded={expandedSection === "polls"}
                onToggle={() => toggleSection("polls")}
                onSeeAll={() => setDetailView("polls")}
              />

              <NotesSection
                isExpanded={expandedSection === "notes"}
                onToggle={() => toggleSection("notes")}
              />

              <TasksSection
                isExpanded={expandedSection === "tasks"}
                onToggle={() => toggleSection("tasks")}
              />
            </>
          )}
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

      {showSettingsModal && activeChannel && (
        <ChannelSettingsModal
          channel={activeChannel}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}
