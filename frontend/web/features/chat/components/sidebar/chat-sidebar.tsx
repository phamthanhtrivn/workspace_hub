"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  UserPlus,
  RefreshCw,
  Plus,
  ChevronDown,
  PlusCircle,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SearchUserModal from "../modals/search-user-modal";
import CreateSpaceModal from "../modals/create-space-modal";
import CreateChannelModal from "../modals/create-channel-modal";
import InviteSpaceMembersModal from "../modals/invite-space-members-modal";
import BrowseChannelsModal from "../modals/browse-channels-modal";
import ConversationItem from "./conversation-item";
import DirectConversationsSection from "./direct-conversations-section";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setActiveChannel,
  setActiveDirectMessage,
  setActiveSpaceId,
} from "@/store/chat/chat-slice";
import {
  ChatProfilesMap,
  ChatContextType,
  ConversationResponse,
  UserProfileResponse,
} from "../../types/chat.types";
import { sortDirectConversations } from "../../utils/direct-conversation-utils";
import { chatKeys } from "../../types/chat.constant";
import { cn } from "@/lib/utils";
import {
  useActiveChat,
  useSpaceChannelsQuery,
  useSpacesQuery,
} from "../../hooks/useChatQueries";
import {
  clearChatUnread,
  upsertChannelCache,
  upsertDirectMessageCache,
  updateChannelsCache,
} from "../../utils/chat-cache";

interface ChatSidebarProps {
  onSelectChat?: () => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const [isChannelsDropdownOpen, setIsChannelsDropdownOpen] = useState(false);
  const [isBrowseChannelsModalOpen, setIsBrowseChannelsModalOpen] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceId = useAppSelector((state) => state.chat.activeSpaceId);
  const { activeChat } = useActiveChat();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSpaceDropdownOpen(false);
      }
      if (channelsDropdownRef.current && !channelsDropdownRef.current.contains(event.target as Node)) {
        setIsChannelsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: spacesData, refetch: refetchSpaces } = useSpacesQuery(currentUserId);
  const spaces = spacesData || [];

  // Automatically select first space if none active
  useEffect(() => {
    if (spaces.length > 0 && !activeSpaceId) {
      dispatch(setActiveSpaceId(spaces[0].id));
    }
  }, [spaces, activeSpaceId, dispatch]);

  const activeSpace = useMemo(() => {
    return spaces.find((g: any) => g.id === activeSpaceId) || null;
  }, [spaces, activeSpaceId]);

  const {
    data: channelsData,
    isLoading: loadingChannels,
    refetch: refetchChannels,
  } = useSpaceChannelsQuery(activeSpaceId);
  const channels = channelsData?.channels || [];

  const hydrateDirectMessage = useCallback(
    (
      conversation: ConversationResponse,
      profiles?: ChatProfilesMap,
    ): ConversationResponse => {
      if (!profiles) return conversation;

      return {
        ...conversation,
        members: conversation.members?.map((member) => ({
          ...member,
          profile: profiles[member.userId] || (member as any).profile,
          fullName:
            profiles[member.userId]?.fullName || (member as any).fullName,
          avatarUrl:
            profiles[member.userId]?.avatarUrl || (member as any).avatarUrl,
        })),
      };
    },
    [],
  );

  const handleSelectSpace = (spaceId: string) => {
    dispatch(setActiveSpaceId(spaceId));
    dispatch(setActiveConversation(null));
    setIsSpaceDropdownOpen(false);
  };

  const handleSelectConversation = useCallback(
    (
      conv: ConversationResponse,
      profiles?: ChatProfilesMap,
      chatType?: ChatContextType,
    ) => {
      const hydratedConversation = hydrateDirectMessage(conv, profiles);
      const nextChatType =
        chatType ?? (profiles ? ChatContextType.DIRECT_MESSAGE : ChatContextType.CHANNEL);
      dispatch(
        nextChatType === ChatContextType.DIRECT_MESSAGE
          ? setActiveDirectMessage(hydratedConversation)
          : setActiveChannel(hydratedConversation),
      );

      // Optimistically clear unread count
      queryClient.setQueryData(
        chatKeys.directMessages(currentUserId),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            directMessages: (oldData.directMessages || oldData.conversations || []).map((c: any) =>
              c.id === conv.id
                ? {
                    ...c,
                    unreadCount: 0,
                    hasMention: false,
                    hasUnreadThread: false,
                  }
                : c,
            ),
          };
        },
      );

      // Invalidate channels query to keep counts in sync if necessary
      if ("spaceId" in conv && conv.spaceId) {
        updateChannelsCache(queryClient, conv.id, clearChatUnread, conv.spaceId);
      }

      if (onSelectChat) onSelectChat();
    },
    [
      currentUserId,
      dispatch,
      hydrateDirectMessage,
      onSelectChat,
      queryClient,
    ],
  );

  const handleNewConversation = useCallback(
    async (newConversation: any, selectedProfile?: UserProfileResponse & { id?: string | null }) => {
      const selectedUserId = selectedProfile?.id;

      if (selectedUserId) {
        queryClient.setQueryData(
          chatKeys.directMessages(currentUserId),
          (oldData: any) => {
            if (!oldData) return oldData;
            const conversations = oldData.directMessages || oldData.conversations || [];
            const exists = conversations.some((conv: any) => conv.id === newConversation.id);
            const nextConversations = exists
              ? conversations.map((conv: any) =>
                  conv.id === newConversation.id ? newConversation : conv,
                )
              : [newConversation, ...conversations];

            return {
              ...oldData,
              directMessages: sortDirectConversations(
                nextConversations,
                currentUserId,
              ),
              profiles: {
                ...(oldData.profiles || {}),
                [selectedUserId]: selectedProfile,
              },
            };
          },
        );

        queryClient.setQueriesData(
          { queryKey: ["chat-member-profiles"] },
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              profiles: {
                ...(oldData.profiles || {}),
                [selectedUserId]: selectedProfile,
              },
            };
          },
        );
      }

      queryClient.invalidateQueries({
        queryKey: chatKeys.directMessages(currentUserId),
      });
      const hydratedConversation =
        selectedUserId && selectedProfile
          ? hydrateDirectMessage(newConversation, {
              [selectedUserId]: selectedProfile,
            })
          : newConversation;

      upsertDirectMessageCache(queryClient, currentUserId, hydratedConversation);
      dispatch(setActiveDirectMessage(hydratedConversation));
      router.push(`/chat?id=${newConversation.id}`);
      if (onSelectChat) onSelectChat();
    },
    [
      currentUserId,
      dispatch,
      hydrateDirectMessage,
      router,
      onSelectChat,
      queryClient,
    ],
  );

  useEffect(() => {
    const handleRefreshConversations = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      if (payload?.conversation) {
        handleNewConversation(payload.conversation, payload.selectedProfile);
      } else if (payload) {
        handleNewConversation(payload);
      } else {
        queryClient.invalidateQueries({
          queryKey: chatKeys.directMessages(currentUserId),
        });
      }
    };

    window.addEventListener("REFRESH_CONVERSATIONS", handleRefreshConversations);
    return () => {
      window.removeEventListener("REFRESH_CONVERSATIONS", handleRefreshConversations);
    };
  }, [currentUserId, handleNewConversation, queryClient]);

  const handleNewSpace = (newSpace: any) => {
    refetchSpaces();
    dispatch(setActiveSpaceId(newSpace.id));
  };

  const handleNewChannel = (newChannel: any) => {
    if (newChannel?.spaceId) {
      upsertChannelCache(queryClient, newChannel);
    }
    refetchChannels();
    handleSelectConversation(newChannel, undefined, ChatContextType.CHANNEL);
  };

  const handleReload = async () => {
    if (isReloading) return;
    setIsReloading(true);
    dispatch(setActiveConversation(null));

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["spaces"] }),
        queryClient.invalidateQueries({ queryKey: ["channels"] }),
        queryClient.invalidateQueries({ queryKey: ["direct-messages"] }),
        queryClient.invalidateQueries({ queryKey: ["chat-member-profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["messages"] }),
        queryClient.invalidateQueries({ queryKey: ["media"] }),
        queryClient.invalidateQueries({ queryKey: ["pinnedMessagesPreview"] }),
        queryClient.invalidateQueries({ queryKey: ["pinnedMessagesDetail"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-threads"] }),
        queryClient.invalidateQueries({ queryKey: ["threadMessages"] }),
        refetchSpaces(),
        refetchChannels(),
        
      ]);
    } finally {
      setIsReloading(false);
    }
  };

  // Filtered lists based on search
  const joinedChannels = useMemo(() => {
    return channels.filter((channel: any) =>
      channel.members?.some((m: any) => m.userId === currentUserId)
    );
  }, [channels, currentUserId]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return joinedChannels;
    return joinedChannels.filter((c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [joinedChannels, searchQuery]);

  return (
    <div className="w-full h-full bg-white border-r border-slate-200/60 flex flex-col select-none">
      {/* Header with Space Selector Dropdown */}
      <div className="p-3 border-b border-slate-100 relative" ref={dropdownRef}>
        <div
          onClick={() => setIsSpaceDropdownOpen((prev) => !prev)}
          className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200/40 hover:bg-slate-100 hover:border-slate-200/80 rounded-xl cursor-pointer transition-all duration-200 select-none group"
        >
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
              <span>{activeSpace ? activeSpace.name : "Select Space"}</span>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0 transition" />
            </h2>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Workspace
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReload();
            }}
            disabled={isReloading}
            className={cn(
              "cursor-pointer p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-700 transition disabled:cursor-wait disabled:opacity-70",
              isReloading && "bg-slate-200/60 text-blue-600",
            )}
            title={isReloading ? "Reloading..." : "Reload"}
          >
            <RefreshCw size={14} className={isReloading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isSpaceDropdownOpen && (
          <div className="absolute left-3 right-3 top-[64px] z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 py-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Spaces
            </div>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 px-1">
              {spaces.map((space: any) => (
                <div
                  key={space.id}
                  onClick={() => handleSelectSpace(space.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between",
                    space.id === activeSpaceId
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate">{space.name}</span>
                </div>
              ))}
              {spaces.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400 italic">
                  No spaces joined
                </div>
              )}
            </div>
            <div className="h-[1px] bg-slate-100 my-1" />
            <div className="px-1 flex flex-col gap-0.5">
              <button
                onClick={() => {
                  setIsCreateSpaceModalOpen(true);
                  setIsSpaceDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer transition"
              >
                <PlusCircle size={14} className="text-slate-400" />
                Create new space
              </button>
              <button
                onClick={() => {
                  if (activeSpaceId) {
                    setIsInviteModalOpen(true);
                  }
                  setIsSpaceDropdownOpen(false);
                }}
                disabled={!activeSpaceId}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none rounded-lg flex items-center gap-2 cursor-pointer transition"
              >
                <UserPlus size={14} className="text-slate-400" />
                Invite members
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Filter */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100/70 border border-transparent focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 rounded-xl outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Main Items Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Channels Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
            <button
              onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
              className="flex items-center gap-1 hover:text-slate-600 transition cursor-pointer text-left"
            >
              {isChannelsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Channels</span>
            </button>
            {activeSpaceId && (
              <div className="relative" ref={channelsDropdownRef}>
                <button
                  onClick={() => setIsChannelsDropdownOpen(!isChannelsDropdownOpen)}
                  className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title="Channel options"
                >
                  <Plus size={14} />
                </button>
                {isChannelsDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-150 rounded-xl shadow-lg z-50 py-1 text-slate-700 font-normal normal-case">
                    <button
                      onClick={() => {
                        setIsBrowseChannelsModalOpen(true);
                        setIsChannelsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Globe size={14} className="text-slate-400" />
                      Browse channels
                    </button>
                    <button
                      onClick={() => {
                        setIsCreateChannelModalOpen(true);
                        setIsChannelsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Plus size={14} className="text-slate-400" />
                      Create new channel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isChannelsExpanded && (
            <div
              className={cn(
                "pr-1 flex flex-col gap-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full",
                filteredChannels.length > 10 && "max-h-80 overflow-y-auto",
              )}
            >
              {loadingChannels ? (
                <div className="text-[11px] text-slate-400 italic px-3 py-1">
                  Loading channels...
                </div>
              ) : filteredChannels.length > 0 ? (
                filteredChannels.map((conv: any) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    currentUserId={currentUserId}
                    isActive={activeChat?.id === conv.id}
                    onClick={handleSelectConversation}
                  />
                ))
              ) : (
                <div className="text-[11px] text-slate-400 italic px-3 py-1">
                  {activeSpaceId ? "No channels yet" : "Select a space to view channels"}
                </div>
              )}
            </div>
          )}
        </div>

        <DirectConversationsSection
          activeConversationId={activeChat?.id}
          currentUserId={currentUserId}
          searchQuery={searchQuery}
          onCreateDirectConversation={() => setIsSearchModalOpen(true)}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Modals */}
      <CreateSpaceModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
        onSpaceCreated={handleNewSpace}
      />
      {activeSpaceId && (
        <>
          <CreateChannelModal
            isOpen={isCreateChannelModalOpen}
            onClose={() => setIsCreateChannelModalOpen(false)}
            spaceId={activeSpaceId}
            onChannelCreated={handleNewChannel}
          />
          <InviteSpaceMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            spaceId={activeSpaceId}
          />
          <BrowseChannelsModal
            isOpen={isBrowseChannelsModalOpen}
            onClose={() => setIsBrowseChannelsModalOpen(false)}
            spaceId={activeSpaceId}
            currentUserId={currentUserId}
            onJoinSuccess={handleNewChannel}
          />
        </>
      )}
      <SearchUserModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onConversationCreated={handleNewConversation}
      />
    </div>
  );
}
