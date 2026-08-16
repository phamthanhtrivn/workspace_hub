"use client";

import { useState, useEffect, useRef } from "react";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { getChannelMedia, muteChannel, pinChannel } from "../../api/chat.api";
import MediaLightbox from "../message/media-lightbox";
import ChannelSettingsSection from "./channel-settings-section";
import ChannelActionsSection from "./channel-actions-section";
import FilesSection from "./files-section";
import PollsSection from "./polls-section";
import NotesSection from "./notes-section";
import TasksSection from "./tasks-section";
import PinnedMessagesSection from "./pinned-messages-section";
import MediaDetailView from "./media-detail-view";
import PollDetailView from "./poll-detail-view";
import PinnedMessagesDetailView from "./pinned-messages-detail-view";
import SearchMessagesSection from "./search-messages-section";
import ChannelSettingsModal from "../modals/channel-settings-modal";
import ThreadsListView from "./threads-list-view";
import { X, Bell, BellOff, Pin, Hash, Globe } from "lucide-react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  updateMuteStatus,
  updatePinStatus,
  setHighlightMessageId,
} from "@/store/chat/chat-slice";
import { chatKeys } from "../../types/chat.constant";
import { ChannelResponse } from "../../types/chat.types";
import { useActiveChat } from "../../hooks/useChatQueries";
import { logApiError } from "@/lib/interceptors";
import { sortChannelsByPin } from "../../utils/direct-conversation-utils";

interface ChannelRightPanelProps {
  onClose: () => void;
  initialDetailView?: "files" | "polls" | "search" | "threads" | null;
}

export default function ChannelRightPanel({
  onClose,
  initialDetailView,
}: ChannelRightPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "pinned",
  );
  const [detailView, setDetailView] = useState<
    "files" | "polls" | "search" | "threads" | "pinned" | null
  >(initialDetailView || null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const lastFetchedChatId = useRef<string | null>(null);

  const { activeChat: activeConversation } = useActiveChat();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceId = useAppSelector((state) => state.chat.activeSpaceId);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const activeChannel = activeConversation as ChannelResponse;

  useEffect(() => {
    if (initialDetailView !== undefined) {
      setDetailView(initialDetailView);
    }
  }, [initialDetailView]);

  const currentMember = activeChannel?.members?.find(
    (m: any) => m.userId === currentUserId,
  );

  useEffect(() => {
    setIsMuted(currentMember?.muted || false);
  }, [currentMember]);

  const isPinned = currentMember?.pinned || false;

  const updateChannelMemberCache = (
    channelId: string,
    memberPatch: { muted?: boolean; pinned?: boolean },
  ) => {
    const queryKey = chatKeys.channels(activeSpaceId);
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      const nextChannels = oldData.map((channel: any) => {
        if (channel.id !== channelId) return channel;
        return {
          ...channel,
          members: channel.members?.map((member: any) =>
            member.userId === currentUserId
              ? { ...member, ...memberPatch }
              : member,
          ),
        };
      });
      return sortChannelsByPin(nextChannels, currentUserId);
    });
  };

  const handleToggleMute = async () => {
    if (!activeChannel || !currentUserId) return;
    const targetMuted = !isMuted;
    setIsMuted(targetMuted);

    try {
      await muteChannel(activeChannel.id, targetMuted);
      dispatch(
        updateMuteStatus({
          conversationId: activeChannel.id,
          userId: currentUserId,
          muted: targetMuted,
        }),
      );
      updateChannelMemberCache(activeChannel.id, {
        muted: targetMuted,
      });
    } catch (error) {
      setIsMuted(isMuted);
      console.error("Failed to update mute status:", error);
    }
  };

  const handleTogglePin = async () => {
    if (!activeChannel || !currentUserId) return;
    const targetPinned = !isPinned;

    dispatch(
      updatePinStatus({
        conversationId: activeChannel.id,
        userId: currentUserId,
        pinned: targetPinned,
      }),
    );
    updateChannelMemberCache(activeChannel.id, {
      pinned: targetPinned,
    });

    try {
      await pinChannel(activeChannel.id, targetPinned);
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
    } catch (error) {
      dispatch(
        updatePinStatus({
          conversationId: activeChannel.id,
          userId: currentUserId,
          pinned: isPinned,
        }),
      );
      updateChannelMemberCache(activeChannel.id, {
        pinned: isPinned,
      });
      console.error("Failed to update pin status:", error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleJumpToMessage = (messageId: string) => {
    dispatch(setHighlightMessageId(messageId));
    setDetailView(null);
    onClose();
  };

  useEffect(() => {
    if (
      activeChannel?.id &&
      expandedSection === "files" &&
      lastFetchedChatId.current !== activeChannel.id
    ) {
      getChannelMedia(activeChannel.id)
        .then((res: any) => {
          if (res.data && res.data.medias) {
            setMediaItems(res.data.medias);
            lastFetchedChatId.current = activeChannel.id;
          }
        })
        .catch((err: unknown) =>
          logApiError(err, "Failed to fetch channel media"),
        );
    }
  }, [activeChannel?.id, expandedSection]);

  useEffect(() => {
    if (activeChannel?.id && lastFetchedChatId.current !== activeChannel.id) {
      setMediaItems([]);
    }
  }, [activeChannel?.id]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      const getEventChannelId = (payload: any) =>
        payload?.channelId ?? payload?.conversationId;

      const handleMediaUpdated = (data: any) => {
        if (getEventChannelId(data) === activeChannel?.id && data.media) {
          setMediaItems((prev) => [...data.media, ...prev]);
        }
      };

      const handleMemberJoin = (data: any) => {
        if (
          activeChannel &&
          getEventChannelId(data) === activeChannel.id &&
          data.member &&
          data.profile
        ) {
          const isAlreadyMember = activeChannel.members?.some(
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
  }, [activeChannel, dispatch]);

  if (detailView === "files") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <MediaDetailView
          conversationId={activeChannel.id}
          isDirect={false}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "polls") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PollDetailView
          conversationId={activeChannel.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "pinned") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PinnedMessagesDetailView
          conversationId={activeChannel.id}
          isDirect={false}
          onBack={() => setDetailView(null)}
          onJumpToMessage={handleJumpToMessage}
        />
      </div>
    );
  }

  if (detailView === "search") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <SearchMessagesSection
          conversationId={activeChannel.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "threads") {
    return (
      <div className="w-full border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <ThreadsListView
          conversationId={activeChannel.id}
          isDirect={false}
          onClose={() => setDetailView(null)}
        />
      </div>
    );
  }

  const displayName = activeChannel.name || "Channel";
  const displayAvatarUrl = activeChannel.avatarUrl;
  const displayDescription = `${activeChannel?.members?.length || 0} members`;

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Channel Details</h2>
        <button
          onClick={onClose}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col items-center border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-2xl flex items-center gap-1.5">
            <span>{displayName}</span>
          </h3>
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

        {/* Accordions */}
        <div className="py-2">
          <ChannelSettingsSection
            activeChannel={activeChannel}
            currentUserId={currentUserId}
            onOpenSettings={() => setShowSettingsModal(true)}
          />

          <PinnedMessagesSection
            conversationId={activeChannel.id}
            isDirect={false}
            isExpanded={expandedSection === "pinned"}
            onToggle={() => toggleSection("pinned")}
            onSeeAll={() => setDetailView("pinned")}
            onJumpToMessage={handleJumpToMessage}
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
        </div>
      </div>

      {activeChannel && (
        <ChannelActionsSection
          activeChannel={activeChannel}
          currentUserId={currentUserId}
          onClose={onClose}
        />
      )}

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

      {showSettingsModal && (
        <ChannelSettingsModal
          channel={activeChannel}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}
