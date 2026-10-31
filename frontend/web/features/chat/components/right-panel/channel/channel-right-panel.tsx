"use client";

import { useChatMediaPreview } from "../../../hooks/useChatMediaPreview";
import { ChatScope } from "../../../types/chat.constant";

import type { ChatContextPayload, ChatSocketMemberPayload } from "@/features/chat/types/chat-socket.types";
import { QueryFeedback } from "@/components/common/query-feedback";
import { useState, useEffect } from "react";
import { socketService } from "../../../api/chat-socket.service";
import { ChatEvent } from "../../../api/chat.events";
import {
  muteChannel,
  pinChannel,
} from "../../../api/chat.api";
import MediaLightbox from "../../message/media-lightbox";
import ChannelSettingsSection from "./channel-settings-section";
import ChannelOwnerSection from "./channel-owner-section";
import ChannelActionsSection from "./channel-actions-section";
import FilesSection from "../files/files-section";
import PollsSection from "../polls/polls-section";
import NotesSection from "../notes/notes-section";
import PinnedMessagesSection from "../pinned-messages/pinned-messages-section";
import PollDetailView from "../polls/poll-detail-view";
import NoteDetailView from "../notes/note-detail-view";
import PinnedMessagesDetailView from "../pinned-messages/pinned-messages-detail-view";
import SearchMessagesSection from "../search/search-messages-section";
import ChannelSettingsModal from "../../modals/channel/channel-settings-modal";
import ThreadsListView from "../thread/threads-list-view";
import { X, Bell, BellOff, Pin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  updateMuteStatus,
  updatePinStatus,
  setHighlightMessageId,
} from "@/store/chat/chat-slice";
import { chatKeys } from "../../../types/chat.constant";
import { ChannelResponse } from "../../../types/chat.types";
import { useActiveChat, type SpaceChannelsQueryData } from "../../../hooks/useChatQueries";
import { sortChannelsByPin } from "../../../utils/direct-conversation-utils";
import MediaDetailView from "../files/media-detail-view";
import { Button } from "@/components/ui/button";


interface ChannelRightPanelProps {
  onClose: () => void;
  initialDetailView?: "files" | "polls" | "notes" | "search" | "threads" | null;
}

export default function ChannelRightPanel({
  onClose,
  initialDetailView,
}: ChannelRightPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "pinned",
  );
  const [detailView, setDetailView] = useState<
    "files" | "polls" | "notes" | "search" | "threads" | "pinned" | null
  >(initialDetailView || null);




  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);


  const { activeChat: activeConversation } = useActiveChat();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceId = useAppSelector((state) => state.chat.activeSpaceId);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();


  const activeChannel = activeConversation as ChannelResponse;
  const mediaQuery = useChatMediaPreview(ChatScope.CHANNEL, activeChannel?.id, expandedSection === "files");
  const mediaItems = mediaQuery.medias;
  const mediaLoading = mediaQuery.isFetching;
  const mediaError = mediaQuery.isError;

  const [previousDetailView, setPreviousDetailView] = useState(initialDetailView);
  if (previousDetailView !== initialDetailView) {
    setPreviousDetailView(initialDetailView);
    if (initialDetailView !== undefined) setDetailView(initialDetailView);
  }

  const currentMember = activeChannel?.members?.find(
    (m) => m.userId === currentUserId,
  );

  const isMuted = currentMember?.muted ?? false;

  const isPinned = currentMember?.pinned || false;

  const updateChannelMemberCache = (
    channelId: string,
    memberPatch: { muted?: boolean; pinned?: boolean },
  ) => {
    const queryKey = chatKeys.channels(activeSpaceId);
    queryClient.setQueryData<SpaceChannelsQueryData>(queryKey, (oldData) => {
      if (!oldData) return oldData;
      const nextChannels = oldData.channels.map((channel) => {
        if (channel.id !== channelId) return channel;
        return {
          ...channel,
          members: channel.members?.map((member) =>
            member.userId === currentUserId
              ? { ...member, ...memberPatch }
              : member,
          ),
        };
      });
      return { ...oldData, channels: sortChannelsByPin(nextChannels, currentUserId) };
    });
  };

  const handleToggleMute = async () => {
    if (!activeChannel || !currentUserId) return;
    const targetMuted = !isMuted;
    updateChannelMemberCache(activeChannel.id, { muted: targetMuted });

    try {
      await muteChannel(activeChannel.id, targetMuted);
      dispatch(
        updateMuteStatus({
          conversationId: activeChannel.id,
          userId: currentUserId,
          muted: targetMuted,
        }),
      );

    } catch (error) {
      updateChannelMemberCache(activeChannel.id, { muted: isMuted });
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
    const socket = socketService.getSocket();
    if (socket) {
      const getEventChannelId = (payload: Partial<ChatContextPayload>) =>
        payload?.channelId ?? payload?.conversationId;


      const handleMemberJoin = (data: ChatSocketMemberPayload) => {
        if (
          activeChannel &&
          getEventChannelId(data) === activeChannel.id &&
          data.member &&
          data.profile
        ) {
          const joinedUserId = data.member.userId;
          const isAlreadyMember = activeChannel.members?.some(
            (m) => m.userId === joinedUserId,
          );
          if (!isAlreadyMember) {
            queryClient.invalidateQueries({ queryKey: ["channels"] });
          }
        }
      };

      socket.on(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);

      return () => {
        socket.off(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
      };
    }
  }, [activeChannel, dispatch]);

  if (detailView === "files") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
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
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PollDetailView
          conversationId={activeChannel.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "notes") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <NoteDetailView
          conversationId={activeChannel.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "pinned") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
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
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <SearchMessagesSection
          conversationId={activeChannel.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "threads") {
    return (
      <div className="w-full min-h-0 min-w-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
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
  const memberCount = activeChannel?.members?.length || 0;
  const displayDescription = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  return (
    <div className="w-full h-full min-h-0 min-w-0 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Channel Details</h2>
        <Button variant="unstyled" aria-label="Close"
          onClick={onClose}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <X size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col items-center border-b border-border">
          <h3 className="font-semibold text-foreground text-section-title flex items-center gap-1.5">
            <span>{displayName}</span>
          </h3>
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

        <ChannelOwnerSection channel={activeChannel} />

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

          {expandedSection === "files" && <QueryFeedback label="conversation files" pending={mediaLoading} error={mediaError} retrying={mediaLoading} onRetry={() => { void mediaQuery.refetch(); }} />}
          <FilesSection
            isExpanded={expandedSection === "files"}
            onToggle={() => toggleSection("files")}
            files={mediaItems}
            loading={mediaLoading}
            error={mediaError}
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
            onSeeAll={() => setDetailView("notes")}
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
