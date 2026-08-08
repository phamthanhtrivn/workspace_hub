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
  getUserGroups,
  getGroupChannels,
} from "../../api/chat.api";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setActiveGroupId,
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
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { activeConversation, activeGroupId } = useAppSelector((state) => state.chat);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch groups
  const { data: groupsData, refetch: refetchGroups } = useQuery({
    queryKey: ["groups", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await getUserGroups();
      return res?.success ? res.data : [];
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });
  const groups = groupsData || [];

  // Automatically select first group if none active
  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) {
      dispatch(setActiveGroupId(groups[0].id));
    }
  }, [groups, activeGroupId, dispatch]);

  const activeGroup = useMemo(() => {
    return groups.find((g: any) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  // Fetch channels for active group
  const { data: channelsData, isLoading: loadingChannels, refetch: refetchChannels } = useQuery({
    queryKey: ["channels", activeGroupId],
    queryFn: async () => {
      if (!activeGroupId) return [];
      const res = await getGroupChannels(activeGroupId);
      return res?.success ? res.data : [];
    },
    enabled: !!activeGroupId,
    staleTime: 1000 * 60 * 5,
  });
  const channels = channelsData || [];

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
  const memberProfiles = convsData?.profiles || {};

  // Direct Messages Filter
  const directMessages = useMemo(() => {
    return conversations.filter((conv: any) => conv.type === "DIRECT");
  }, [conversations]);

  const handleSelectGroup = (groupId: string) => {
    dispatch(setActiveGroupId(groupId));
    dispatch(setActiveConversation(null));
    setIsGroupDropdownOpen(false);
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
      if (conv.groupId) {
        queryClient.setQueryData(
          ["channels", conv.groupId],
          (oldChannels: any) => {
            if (!oldChannels) return oldChannels;
            return oldChannels.map((c: any) =>
              c.id === conv.id
                ? {
                    ...c,
                    unreadCount: 0,
                    hasMention: false,
                    hasUnreadThread: false,
                  }
                : c,
            );
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

  const handleNewGroup = (newGroup: any) => {
    refetchGroups();
    dispatch(setActiveGroupId(newGroup.id));
  };

  const handleNewChannel = (newChannel: any) => {
    refetchChannels();
    handleSelectConversation(newChannel);
  };

  const handleReload = () => {
    refetchGroups();
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
      const name = profile?.fullName || "Người dùng";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [directMessages, searchQuery, memberProfiles, currentUserId]);

  return (
    <div className="w-full h-full bg-slate-50 border-r border-slate-200/80 flex flex-col select-none">
      {/* Header with Group Selector Dropdown */}
      <div className="p-3 border-b border-slate-200/60 relative" ref={dropdownRef}>
        <div
          onClick={() => setIsGroupDropdownOpen((prev) => !prev)}
          className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-200/60 rounded-xl cursor-pointer transition select-none group"
        >
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
              <span>{activeGroup ? activeGroup.name : "Chọn Nhóm"}</span>
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
            className="p-1.5 hover:bg-slate-300/50 rounded-lg text-slate-500 hover:text-slate-700 transition"
            title="Tải lại"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isGroupDropdownOpen && (
          <div className="absolute left-3 right-3 top-[56px] z-50 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Danh sách nhóm
            </div>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 px-1">
              {groups.map((group: any) => (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between",
                    group.id === activeGroupId
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate">{group.name}</span>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400 italic">
                  Chưa tham gia nhóm nào
                </div>
              )}
            </div>
            <div className="h-[1px] bg-slate-100 my-1" />
            <div className="px-1 flex flex-col gap-0.5">
              <button
                onClick={() => {
                  setIsCreateGroupModalOpen(true);
                  setIsGroupDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer transition"
              >
                <PlusCircle size={14} className="text-slate-400" />
                Tạo nhóm mới
              </button>
              <button
                onClick={() => {
                  if (activeGroupId) {
                    setIsInviteModalOpen(true);
                  }
                  setIsGroupDropdownOpen(false);
                }}
                disabled={!activeGroupId}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none rounded-lg flex items-center gap-2 cursor-pointer transition"
              >
                <UserPlus size={14} className="text-slate-400" />
                Mời thành viên
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Filter */}
      <div className="p-3 border-b border-slate-200/40">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-200/50 focus:bg-white border border-transparent focus:border-slate-300 rounded-lg outline-none transition"
          />
        </div>
      </div>

      {/* Main Items Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-5">
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
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 transition text-xs font-semibold cursor-pointer",
              !activeConversation && "opacity-50 cursor-not-allowed"
            )}
          >
            <MessageCircle size={15} className="text-slate-500" />
            <span>Luồng thảo luận (Threads)</span>
          </button>
        </div>

        {/* Channels Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Kênh trò chuyện</span>
            {activeGroupId && (
              <button
                onClick={() => setIsCreateChannelModalOpen(true)}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Tạo kênh mới"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {loadingChannels ? (
              <div className="text-[11px] text-slate-400 italic px-2 py-1">
                Đang tải kênh...
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
              <div className="text-[11px] text-slate-400 italic px-2 py-1">
                {activeGroupId ? "Chưa có kênh nào" : "Chọn nhóm để xem kênh"}
              </div>
            )}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Tin nhắn cá nhân (DMs)</span>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Tìm bạn chat mới"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {loadingConvs ? (
              <div className="text-[11px] text-slate-400 italic px-2 py-1">
                Đang tải...
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
              <div className="text-[11px] text-slate-400 italic px-2 py-1">
                Không có tin nhắn nào
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateWorkspaceGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onGroupCreated={handleNewGroup}
      />
      {activeGroupId && (
        <>
          <CreateChannelModal
            isOpen={isCreateChannelModalOpen}
            onClose={() => setIsCreateChannelModalOpen(false)}
            groupId={activeGroupId}
            onChannelCreated={handleNewChannel}
          />
          <InviteGroupMembersModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            groupId={activeGroupId}
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
