"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  UserPlus,
  Users,
  MessageSquare,
  RefreshCw,
  Plus,
  ChevronDown,
  Hash,
  Globe,
  PlusCircle,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SearchUserModal from "../modals/search-user-modal";
import CreateWorkspaceGroupModal from "../modals/create-workspace-group-modal";
import CreateChannelModal from "../modals/create-channel-modal";
import InviteGroupMembersModal from "../modals/invite-group-members-modal";
import ConversationItem from "./conversation-item";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserConversations,
  getPublicProfile,
  getUserSpaces,
  getSpaceChannels,
} from "../../api/chat.api";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setActiveSpaceId,
} from "@/store/chat/chat-slice";
import { UserProfileResponse } from "../../types/chat.types";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  onSelectChat?: () => void;
  onShowThreads?: () => void;
}

export default function ChatSidebar({ onSelectChat, onShowThreads }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);

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
            profiles[userId] = profileRes?.success
              ? profileRes.data
              : ({ fullName: "Unknown User" } as any);
          } catch (e) {
            profiles[userId] = { fullName: "Unknown User" } as any;
          }
        }),
      );

      return { channels, profiles };
    },
    enabled: !!activeSpaceId,
    staleTime: 1000 * 60 * 5,
  });
  const channels = channelsData?.channels || [];

  // Fetch conversations (for DMs)
  const {
    data: convsData,
    isLoading: loadingConvs,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { conversations: [], profiles: {} };
      const response = await getUserConversations();
      const conversationsData = response?.success ? response.data : [];

      const uniqueUserIds = new Set<string>();
      conversationsData.forEach((conv: any) => {
        conv.members?.forEach((m: any) => {
          if (m.userId) uniqueUserIds.add(m.userId);
        });
      });

      const profiles: Record<string, UserProfileResponse> = {};
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const profileRes = await getPublicProfile(userId);
            profiles[userId] = profileRes?.success
              ? profileRes.data
              : ({ fullName: "Unknown User" } as any);
          } catch (e) {
            profiles[userId] = { fullName: "Unknown User" } as any;
          }
        }),
      );
      return { conversations: conversationsData, profiles };
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });

  const conversations = convsData?.conversations || [];
  const memberProfiles = {
    ...(convsData?.profiles || {}),
    ...(channelsData?.profiles || {}),
  };

  // Direct Messages Filter
  const directMessages = useMemo(() => {
    return conversations.filter((conv: any) => conv.type === "DIRECT");
  }, [conversations]);

  const handleSelectSpace = (spaceId: string) => {
    dispatch(setActiveSpaceId(spaceId));
    dispatch(setActiveConversation(null));
    setIsSpaceDropdownOpen(false);
  };

  const handleSelectConversation = useCallback(
    (conv: any) => {
      dispatch(setActiveConversation(conv));

      // Optimistically clear unread count
      queryClient.setQueryData(
        ["conversations", currentUserId],
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
    async (newConversation: any) => {
      // Invalidate query to load fresh data
      refetchConversations();
      dispatch(setActiveConversation(newConversation));
      router.push(`/chat?id=${newConversation.id}`);
      if (onSelectChat) onSelectChat();
    },
    [dispatch, router, onSelectChat, refetchConversations],
  );

  const handleNewSpace = (newSpace: any) => {
    refetchSpaces();
    dispatch(setActiveSpaceId(newSpace.id));
  };

  const handleNewChannel = (newChannel: any) => {
    refetchChannels();
    handleSelectConversation(newChannel);
  };

  const handleReload = () => {
    refetchSpaces();
    refetchChannels();
    refetchConversations();
  };

  // Filtered lists based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    return channels.filter((c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const filteredDMs = useMemo(() => {
    if (!searchQuery.trim()) return directMessages;
    return directMessages.filter((dm: any) => {
      const otherMember = dm.members?.find((m: any) => m.userId !== currentUserId);
      const profile = otherMember ? memberProfiles[otherMember.userId] : null;
      const name = profile?.fullName || "User";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [directMessages, searchQuery, memberProfiles, currentUserId]);

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
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-700 transition"
            title="Reload"
          >
            <RefreshCw size={14} />
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
        {/* Navigation Section */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              if (onShowThreads && activeConversation) {
                onShowThreads();
              }
            }}
            disabled={!activeConversation}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 text-[13px] font-semibold cursor-pointer",
              !activeConversation && "opacity-40 cursor-not-allowed"
            )}
          >
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
              <MessageCircle size={14} />
            </span>
            <span>Threads</span>
          </button>
        </div>

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

        {/* Direct Messages Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Direct Messages (DMs)</span>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Find new chat"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {loadingConvs ? (
              <div className="text-[11px] text-slate-400 italic px-3 py-1">
                Loading...
              </div>
            ) : filteredDMs.length > 0 ? (
              filteredDMs.map((conv: any) => (
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
                No direct messages
              </div>
            )}
          </div>
        </div>
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
