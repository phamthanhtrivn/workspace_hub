"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  UserPlus,
  Users,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SearchUserModal from "../modals/search-user-modal";
import CreateGroupModal from "../modals/create-group-modal";
import ConversationItem from "./conversation-item";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserConversations, getPublicProfile } from "../../api/chat.api";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  updateMuteStatus,
} from "@/store/chat/chat-slice";
import { UserProfileResponse } from "../../types/chat.types";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { MdOutlineGroupAdd } from "react-icons/md";

interface ChatSidebarProps {
  onSelectChat?: () => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "groups">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { activeConversation } = useAppSelector((state) => state.chat);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { conversations: [], profiles: {} };

      const response = await getUserConversations();
      const conversationsData = response?.success ? response.data : [];

      const uniqueUserIds = new Set<string>();
      conversationsData.forEach((conv: any) => {
        conv.members?.forEach((m: any) => {
          if (m.userId) {
            uniqueUserIds.add(m.userId);
          }
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const conversations = data?.conversations || [];
  const memberProfiles = data?.profiles || {};

  const handleReload = useCallback(() => {
    router.push("/chat");
    dispatch(setActiveConversation(null));
    refetch();
  }, [router, dispatch, refetch]);

  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id || null;
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!currentUserId) return;

    const timeout = setTimeout(() => {
      const socket = socketService.getSocket();
      if (!socket) return;

      const handleNewMessage = (message: any) => {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            const prev = oldData.conversations;
            const index = prev.findIndex(
              (c: any) => c.id === message.conversationId,
            );
            if (index > -1) {
              const conv = { ...prev[index] };

              if (message.threadParentId) {
                // Thread reply: do not bump, do not change latest message preview
                if (message.senderId !== currentUserId) {
                  conv.hasUnreadThread = true;
                }
                const newConversations = [...prev];
                newConversations[index] = conv;
                return { ...oldData, conversations: newConversations };
              } else {
                // Normal message: bump to top and update preview
                conv.updatedAt = message.createdAt;
                conv.messages = [message];

                // Increment unread count if we are not currently viewing this conversation and didn't send it
                if (
                  message.senderId !== currentUserId &&
                  message.conversationId !== activeConversationIdRef.current
                ) {
                  conv.unreadCount = (conv.unreadCount || 0) + 1;
                  if (message.mentions?.includes(currentUserId)) {
                    conv.hasMention = true;
                  }
                }

                // Update sender's lastReadMessageId
                if (conv.members) {
                  conv.members = conv.members.map((m: any) =>
                    m.userId === message.senderId
                      ? { ...m, lastReadMessageId: message.id }
                      : m,
                  );
                }

                const newConversations = [...prev];
                newConversations.splice(index, 1);
                newConversations.unshift(conv);
                return { ...oldData, conversations: newConversations };
              }
            }
            return oldData;
          },
        );
      };

      const handleMessageUpdated = (message: any) => {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            const prev = oldData.conversations;
            const index = prev.findIndex(
              (c: any) => c.id === message.conversationId,
            );
            if (index > -1) {
              const conv = { ...prev[index] };
              // Only update the snippet if this edited/recalled message IS the latest message
              if (conv.messages?.[0]?.id === message.id) {
                conv.messages = [message];
                const newConversations = [...prev];
                newConversations[index] = conv;
                return { ...oldData, conversations: newConversations };
              }
            }
            return oldData;
          },
        );
      };

      const handleMessageRead = (data: {
        conversationId: string;
        userId: string;
        messageId: string;
      }) => {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              conversations: oldData.conversations.map((c: any) => {
                if (c.id === data.conversationId) {
                  const updatedConv = { ...c };
                  if (data.userId === currentUserId) {
                    updatedConv.unreadCount = 0;
                    updatedConv.hasMention = false;
                  }
                  if (updatedConv.members) {
                    updatedConv.members = updatedConv.members.map((m: any) =>
                      m.userId === data.userId
                        ? { ...m, lastReadMessageId: data.messageId }
                        : m,
                    );
                  }
                  return updatedConv;
                }
                return c;
              }),
            };
          },
        );
      };

      const handleMemberJoin = (data: any) => {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            const updatedProfiles = data.profile
              ? { ...oldData.profiles, [data.profile.id]: data.profile }
              : oldData.profiles;
            return {
              ...oldData,
              profiles: updatedProfiles,
              conversations: oldData.conversations.map((c: any) => {
                if (c.id === data.conversationId) {
                  const updatedConv = { ...c };
                  const isAlreadyMember = updatedConv.members?.some(
                    (m: any) => m.userId === data.member?.userId,
                  );
                  if (!isAlreadyMember && updatedConv.members && data.member) {
                    updatedConv.members = [...updatedConv.members, data.member];
                  }
                  return updatedConv;
                }
                return c;
              }),
            };
          },
        );
      };

      const handleMemberKickedOrLeft = (data: any) => {
        if (data.userId === currentUserId) {
          // If the current user is kicked or left, invalidate query to refresh conversation list
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        } else {
          // If someone else is kicked or left, just remove them from the members array
          queryClient.setQueryData(
            ["conversations", currentUserId],
            (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                conversations: oldData.conversations.map((c: any) => {
                  if (c.id === data.conversationId) {
                    const updatedConv = { ...c };
                    if (updatedConv.members) {
                      updatedConv.members = updatedConv.members.filter(
                        (m: any) => m.userId !== data.userId,
                      );
                    }
                    return updatedConv;
                  }
                  return c;
                }),
              };
            },
          );
        }
      };

      const handleConversationUpdated = (data: {
        id: string;
        name?: string;
        avatarUrl?: string;
      }) => {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              conversations: oldData.conversations.map((c: any) => {
                if (c.id === data.id) {
                  return {
                    ...c,
                    name: data.name !== undefined ? data.name : c.name,
                    avatarUrl:
                      data.avatarUrl !== undefined
                        ? data.avatarUrl
                        : c.avatarUrl,
                  };
                }
                return c;
              }),
            };
          },
        );
      };

      const handleConversationDisbanded = (data: {
        conversationId: string;
      }) => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      };

      const handleConversationMuteUpdated = (data: {
        conversationId: string;
        muted: boolean;
      }) => {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              conversations: oldData.conversations.map((c: any) => {
                if (c.id === data.conversationId) {
                  return {
                    ...c,
                    members: c.members?.map((m: any) =>
                      m.userId === currentUserId
                        ? { ...m, muted: data.muted }
                        : m,
                    ),
                  };
                }
                return c;
              }),
            };
          },
        );

        dispatch(
          updateMuteStatus({
            conversationId: data.conversationId,
            userId: currentUserId!,
            muted: data.muted,
          }),
        );
      };

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
      socket.on(ChatEvent.MESSAGE_MOVED, handleNewMessage);
      socket.on(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
      socket.on(ChatEvent.MESSAGE_READ, handleMessageRead);
      socket.on(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
      socket.on(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
      socket.on(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
      socket.on(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);
      socket.on(ChatEvent.CONVERSATION_DISBANDED, handleConversationDisbanded);
      socket.on(
        ChatEvent.CONVERSATION_MUTE_UPDATED,
        handleConversationMuteUpdated,
      );

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
        socket.off(ChatEvent.MESSAGE_MOVED, handleNewMessage);
        socket.off(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
        socket.off(ChatEvent.MESSAGE_READ, handleMessageRead);
        socket.off(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
        socket.off(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
        socket.off(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
        socket.off(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);
        socket.off(
          ChatEvent.CONVERSATION_DISBANDED,
          handleConversationDisbanded,
        );
        socket.off(
          ChatEvent.CONVERSATION_MUTE_UPDATED,
          handleConversationMuteUpdated,
        );
      };
    }, 500); // Allow time for layout to connect socket

    return () => clearTimeout(timeout);
  }, [currentUserId, queryClient]);

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
                ? { ...c, unreadCount: 0, hasMention: false, hasUnreadThread: false }
                : c,
            ),
          };
        },
      );

      if (onSelectChat) onSelectChat();
    },
    [dispatch, onSelectChat, queryClient, currentUserId],
  );

  const handleNewConversation = useCallback(
    async (newConversation: any) => {
      const newProfiles: Record<string, UserProfileResponse> = {};
      const membersToFetch = (newConversation.members || []).filter(
        (m: any) => m.userId && !memberProfiles[m.userId],
      );

      await Promise.all(
        membersToFetch.map(async (m: any) => {
          try {
            const res = await getPublicProfile(m.userId);
            newProfiles[m.userId] = res?.success
              ? res.data
              : ({ fullName: "Unknown User" } as any);
          } catch {
            newProfiles[m.userId] = { fullName: "Unknown User" } as any;
          }
        }),
      );

      queryClient.setQueryData(
        ["conversations", currentUserId],
        (oldData: any) => {
          const prevConversations = oldData?.conversations || [];
          const prevProfiles = oldData?.profiles || {};

          const exists = prevConversations.some(
            (c: any) => c.id === newConversation.id,
          );
          const updatedConversations = exists
            ? prevConversations
            : [newConversation, ...prevConversations];

          return {
            conversations: updatedConversations,
            profiles: { ...prevProfiles, ...newProfiles },
          };
        },
      );

      dispatch(setActiveConversation(newConversation));

      // 4. Navigate to the new conversation
      router.push(`/chat?id=${newConversation.id}`);

      if (onSelectChat) onSelectChat();
    },
    [dispatch, router, onSelectChat, queryClient, currentUserId],
  );

  useEffect(() => {
    const handleRefreshEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        handleNewConversation(customEvent.detail);
      }
    };

    window.addEventListener("REFRESH_CONVERSATIONS", handleRefreshEvent);
    return () => {
      window.removeEventListener("REFRESH_CONVERSATIONS", handleRefreshEvent);
    };
  }, [handleNewConversation]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv: any) => {
      // Lọc theo tab
      let matchesTab = true;
      if (activeTab === "personal") matchesTab = conv.type === "DIRECT";
      if (activeTab === "groups") matchesTab = conv.type === "GROUP";

      if (!matchesTab) return false;

      // Lọc theo từ khoá tìm kiếm
      if (searchQuery.trim().length > 0) {
        const lowerQuery = searchQuery.toLowerCase();
        let name = "";

        if (conv.type === "DIRECT") {
          const otherMember = conv.members?.find(
            (m: any) => m.userId !== currentUserId,
          );
          const otherProfile = otherMember
            ? memberProfiles[otherMember.userId]
            : null;
          name = otherProfile?.fullName || "Người dùng";
        } else {
          name = conv.name || "Nhóm trò chuyện";
        }

        return name.toLowerCase().includes(lowerQuery);
      }

      return true;
    });
  }, [conversations, activeTab, searchQuery, memberProfiles, currentUserId]);

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Đoạn chat</h2>
          <div className="flex gap-2">
            <button
              onClick={handleReload}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition cursor-pointer"
              title="Tải lại"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition cursor-pointer"
              title="Tìm kiếm bạn bè"
            >
              <UserPlus size={18} />
            </button>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="p-2 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-600 transition cursor-pointer"
              title="Tạo nhóm trò chuyện"
            >
              <MdOutlineGroupAdd size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm cuộc hội thoại..."
            className="w-full pl-10 text-sm pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 py-2 gap-4 border-b border-gray-100 bg-white">
        <button
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer flex items-center gap-1.5 pb-2 px-1 border-b-2 text-sm font-medium transition ${activeTab === "all" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <MessageSquare size={16} /> Tất cả
        </button>
        <button
          onClick={() => setActiveTab("personal")}
          className={`cursor-pointer flex items-center gap-1.5 pb-2 px-1 border-b-2 text-sm font-medium transition ${activeTab === "personal" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <UserPlus size={16} /> Cá nhân
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`cursor-pointer flex items-center gap-1.5 pb-2 px-1 border-b-2 text-sm font-medium transition ${activeTab === "groups" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Users size={16} /> Nhóm
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 bg-white">
        {loading ? (
          <div className="flex justify-center p-4 text-gray-400">
            Đang tải...
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-1">
            {filteredConversations.map((conv: any) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                currentUserId={currentUserId}
                memberProfiles={memberProfiles}
                isActive={activeConversation?.id === conv.id}
                onClick={handleSelectConversation}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <SearchUserModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onConversationCreated={handleNewConversation}
      />
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onConversationCreated={handleNewConversation}
      />
    </div>
  );
}
