"use client";

import { useState, useEffect, useRef } from "react";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { getConversationMedia } from "../api/chat.api";
import MediaLightbox from "./media-lightbox";
import MembersSection from "./right-panel/members-section";
import ImagesVideosSection from "./right-panel/images-videos-section";
import FilesSection from "./right-panel/files-section";
import PollsSection from "./right-panel/polls-section";
import NotesSection from "./right-panel/notes-section";
import TasksSection from "./right-panel/tasks-section";
import MediaDetailView from "./right-panel/media-detail-view";
import PollDetailView from "./right-panel/poll-detail-view";
import SearchMessagesSection from "./right-panel/search-messages-section";
import GroupSettingsModal from "./group-settings-modal";
import ManageMembersModal from "./manage-members-modal";
import {
  X,
  Bell,
  BellOff,
  LogOut,
  User,
  Users,
  Search,
  Settings,
} from "lucide-react";
import Image from "next/image";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  addMemberProfiles,
  setSelectedProfileUserId,
} from "@/store/chat/chat-slice";

interface ChatRightPanelProps {
  onClose: () => void;
  initialDetailView?: "images" | "files" | "polls" | "search" | null;
}

export default function ChatRightPanel({
  onClose,
  initialDetailView,
}: ChatRightPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "members",
  );
  const [detailView, setDetailView] = useState<
    "images" | "files" | "polls" | "search" | null
  >(initialDetailView || null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const lastFetchedConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (initialDetailView !== undefined) {
      setDetailView(initialDetailView);
    }
  }, [initialDetailView]);

  const { activeConversation, memberProfiles } = useAppSelector(
    (state) => state.chat,
  );
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dispatch = useAppDispatch();

  const isDirect = activeConversation?.type === "DIRECT";

  let displayName = "Group Chat";
  let displayAvatarUrl = null;
  let displayDescription = `${activeConversation?.members?.length || 0} thành viên`;
  let otherMemberId: string | null = null;
  const currentMember = activeConversation?.members?.find(
    (m: any) => m.userId === currentUserId,
  );
  const isOwnerOrAdmin =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  if (isDirect) {
    const otherMember = activeConversation?.members?.find(
      (m) => m.userId !== currentUserId,
    );
    if (otherMember) {
      otherMemberId = otherMember.userId;
      if (memberProfiles?.[otherMember.userId]) {
        const profile = memberProfiles[otherMember.userId];
        displayName = profile.fullName || "User";
        displayAvatarUrl = profile.avatarUrl;
        displayDescription = profile.email || "";
      }
    }
  } else if (activeConversation) {
    displayName = activeConversation.name || "Group Chat";
    displayAvatarUrl = activeConversation.avatarUrl;
  }

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  useEffect(() => {
    if (
      activeConversation?.id &&
      (expandedSection === "images" || expandedSection === "files") &&
      lastFetchedConversationId.current !== activeConversation.id
    ) {
      getConversationMedia(activeConversation.id)
        .then((res: any) => {
          if (res.data && res.data.medias) {
            setMediaItems(res.data.medias);
            lastFetchedConversationId.current = activeConversation.id;
          }
        })
        .catch((err: any) => console.error("Failed to fetch media", err));
    }
  }, [activeConversation?.id, expandedSection]);

  // Reset fetch tracker when conversation changes so it can fetch again if expanded
  useEffect(() => {
    if (
      activeConversation?.id &&
      lastFetchedConversationId.current !== activeConversation.id
    ) {
      // We don't fetch yet, but we clear mediaItems to avoid showing old ones
      setMediaItems([]);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      const handleMediaUpdated = (data: any) => {
        if (data.conversationId === activeConversation?.id && data.media) {
          setMediaItems((prev) => [...data.media, ...prev]);
        }
      };

      const handleMemberJoin = (data: any) => {
        if (
          activeConversation &&
          data.conversationId === activeConversation.id &&
          data.member &&
          data.profile
        ) {
          const isAlreadyMember = activeConversation.members?.some(
            (m) => m.userId === data.member.userId,
          );
          if (!isAlreadyMember) {
            const updatedConversation = {
              ...activeConversation,
              members: [...(activeConversation.members || []), data.member],
            };
            dispatch(setActiveConversation(updatedConversation));
            dispatch(addMemberProfiles({ [data.profile.id]: data.profile }));
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

  if (detailView === "images" || detailView === "files") {
    return (
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <MediaDetailView
          conversationId={activeConversation!.id}
          type={detailView}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "polls") {
    return (
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <PollDetailView
          conversationId={activeConversation!.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  if (detailView === "search") {
    return (
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
        <SearchMessagesSection
          conversationId={activeConversation!.id}
          onBack={() => setDetailView(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Chi tiết</h2>
        <button
          onClick={onClose}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Info Area */}
        <div className="p-6 flex flex-col items-center border-b border-gray-100">
          <div
            className={`w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-bold text-3xl mb-3 shadow-sm overflow-hidden ${
              isDirect ? "cursor-pointer" : ""
            }`}
            onClick={() => {
              if (isDirect && otherMemberId) {
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
            ) : isDirect ? (
              <User size={40} className="text-gray-400" />
            ) : (
              <Users size={40} className="text-gray-400" />
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
          <p className="text-sm text-gray-500 mb-4">{displayDescription}</p>

          <div className="flex gap-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 transition"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
              </div>
              <span className="text-xs font-medium">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </button>

            {!isDirect && (
              <button
                onClick={() => setShowMembersModal(true)}
                className="cursor-pointer flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 transition"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users size={18} />
                </div>
                <span className="text-xs font-medium">Thành viên</span>
              </button>
            )}

            {!isDirect && isOwnerOrAdmin && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="cursor-pointer flex flex-col items-center gap-1 text-gray-600 hover:text-gray-900 transition"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <span className="text-xs font-medium">Cài đặt</span>
              </button>
            )}
          </div>
        </div>

        {/* Accordions */}
        <div className="py-2">
          {!isDirect && (
            <MembersSection
              isExpanded={expandedSection === "members"}
              onToggle={() => toggleSection("members")}
              activeConversation={activeConversation}
              memberProfiles={memberProfiles}
              currentUserId={currentUserId}
            />
          )}

          <ImagesVideosSection
            isExpanded={expandedSection === "images"}
            onToggle={() => toggleSection("images")}
            imagesAndVideos={mediaItems.filter(
              (m) =>
                m.mimeType?.startsWith("image/") ||
                m.mimeType?.startsWith("video/"),
            )}
            onOpenLightbox={(idx) => setLightboxIndex(idx)}
            onSeeAll={() => setDetailView("images")}
          />

          <FilesSection
            isExpanded={expandedSection === "files"}
            onToggle={() => toggleSection("files")}
            filesAndDocs={mediaItems.filter(
              (m) =>
                !m.mimeType?.startsWith("image/") &&
                !m.mimeType?.startsWith("video/"),
            )}
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

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100">
        <button className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium text-sm">
          <LogOut size={16} />
          Rời nhóm
        </button>
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

      {showSettingsModal && (
        <GroupSettingsModal
          conversation={activeConversation}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showMembersModal && currentUserId && (
        <ManageMembersModal
          conversation={activeConversation}
          memberProfiles={memberProfiles}
          currentUserId={currentUserId}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
}
