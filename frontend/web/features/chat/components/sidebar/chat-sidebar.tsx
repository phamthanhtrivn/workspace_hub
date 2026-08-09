"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  UserPlus,
  RefreshCw,
  Plus,
  ChevronDown,
  PlusCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SearchUserModal from "../modals/search-user-modal";
import CreateWorkspaceGroupModal from "../modals/create-workspace-group-modal";
import CreateChannelModal from "../modals/create-channel-modal";
import InviteGroupMembersModal from "../modals/invite-group-members-modal";
import ConversationItem from "./conversation-item";
import DirectConversationsSection from "./direct-conversations-section";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPublicProfile,
  getUserSpaces,
  getSpaceChannels,
} from "../../api/chat.api";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setActiveSpaceId,
} from "@/store/chat/chat-slice";
import {
  ConversationResponse,
  UserProfileResponse,
} from "../../types/chat.types";
import { ChatQueryKey } from "../../types/chat.constant";
import { cn } from "@/lib/utils";

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

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { activeConversation, activeSpaceId } = useAppSelector((state) => state.chat);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSpaceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch spaces
  const { data: spacesData, refetch: refetchSpaces } = useQuery({
    queryKey: ["spaces", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await getUserSpaces();
      return res?.success ? res.data : [];
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });
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

  // Fetch channels for active space
  const { data: channelsData, isLoading: loadingChannels, refetch: refetchChannels } = useQuery({
    queryKey: ["channels", activeSpaceId],
    queryFn: async () => {
      if (!activeSpaceId) return { channels: [], profiles: {} };
      const res = await getSpaceChannels(activeSpaceId);
      const channels = res?.success ? res.data : [];

      const uniqueUserIds = new Set<string>();
      channels.forEach((channel: any) => {
        channel.members?.forEach((member: any) => {
          if (member.userId) uniqueUserIds.add(member.userId);
        });
      });

      const profiles: Record<string, UserProfileResponse> = {};
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const profileRes = await getPublicProfile(userId);
            if (profileRes?.success && profileRes.data) {
              profiles[userId] = profileRes.data;
            }
          } catch (e) {
            console.error("Failed to fetch channel member profile", e);
          }
        }),
      );

      return { channels, profiles };
    },
    enabled: !!activeSpaceId,
    staleTime: 1000 * 60 * 5,
  });
  const channels = channelsData?.channels || [];

  const memberProfiles = channelsData?.profiles || {};

  const handleSelectSpace = (spaceId: string) => {
    dispatch(setActiveSpaceId(spaceId));
    dispatch(setActiveConversation(null));
    setIsSpaceDropdownOpen(false);
  };

  const handleSelectConversation = useCallback(
    (conv: ConversationResponse) => {
      dispatch(setActiveConversation(conv));

      // Optimistically clear unread count
      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((c: any) =>
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
      if (conv.spaceId) {
        queryClient.setQueryData(
          ["channels", conv.spaceId],
          (oldData: any) => {
            if (!oldData?.channels) return oldData;
            return {
              ...oldData,
              channels: oldData.channels.map((c: any) =>
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
      }

      if (onSelectChat) onSelectChat();
    },
    [dispatch, onSelectChat, queryClient, currentUserId],
  );

  const handleNewConversation = useCallback(
    async (newConversation: any, selectedProfile?: UserProfileResponse & { id?: string | null }) => {
      const selectedUserId = selectedProfile?.id;

      if (selectedUserId) {
        queryClient.setQueryData(
          [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            const conversations = oldData.conversations || [];
            const exists = conversations.some((conv: any) => conv.id === newConversation.id);
            return {
              ...oldData,
              conversations: exists
                ? conversations.map((conv: any) =>
                    conv.id === newConversation.id ? newConversation : conv,
                  )
                : [newConversation, ...conversations],
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
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
      });
      dispatch(setActiveConversation(newConversation));
      router.push(`/chat?id=${newConversation.id}`);
      if (onSelectChat) onSelectChat();
    },
    [currentUserId, dispatch, router, onSelectChat, queryClient],
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
          queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
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
    refetchChannels();
    handleSelectConversation(newChannel);
  };

  const handleReload = async () => {
    if (isReloading) return;
    setIsReloading(true);

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["spaces"] }),
        queryClient.invalidateQueries({ queryKey: ["channels"] }),
        queryClient.invalidateQueries({ queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS] }),
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
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    return channels.filter((c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

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
          <div className="flex items-center justify-between px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Channels</span>
            {activeSpaceId && (
              <button
                onClick={() => setIsCreateChannelModalOpen(true)}
                className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Create new channel"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
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
                  memberProfiles={memberProfiles}
                  isActive={activeConversation?.id === conv.id}
                  onClick={handleSelectConversation}
                />
              ))
            ) : (
              <div className="text-[11px] text-slate-400 italic px-3 py-1">
                {activeSpaceId ? "No channels yet" : "Select a space to view channels"}
              </div>
            )}
          </div>
        </div>

        <DirectConversationsSection
          activeConversationId={activeConversation?.id}
          currentUserId={currentUserId}
          searchQuery={searchQuery}
          onCreateDirectConversation={() => setIsSearchModalOpen(true)}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Modals */}
      <CreateWorkspaceGroupModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
        onGroupCreated={handleNewSpace}
      />
      {activeSpaceId && (
        <>
          <CreateChannelModal
            isOpen={isCreateChannelModalOpen}
            onClose={() => setIsCreateChannelModalOpen(false)}
            spaceId={activeSpaceId}
            onChannelCreated={handleNewChannel}
          />
          <InviteGroupMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            spaceId={activeSpaceId}
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
