"use client";

import { useState, useEffect } from "react";
import { Search, Plus, UserPlus, Users, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import SearchUserModal from "./search-user-modal";
import CreateGroupModal from "./create-group-modal";
import ConversationItem from "./conversation-item";

import { getUserConversations, getPublicProfile } from "../api/chat.api";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setMemberProfiles as setMemberProfilesAction,
  addMemberProfiles as addMemberProfilesAction,
} from "@/store/chat/chat-slice";
import { UserProfileResponse } from "../types/chat.types";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { MdOutlineGroupAdd } from "react-icons/md";

interface ChatSidebarProps {
  onSelectChat?: () => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "groups">(
    "all",
  );
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, UserProfileResponse>
  >({});
  const [loading, setLoading] = useState(true);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { activeConversation } = useAppSelector((state) => state.chat);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await getUserConversations();
        const data = response?.success ? response.data : [];
        setConversations(data);

        const uniqueUserIds = new Set<string>();
        data.forEach((conv: any) => {
          conv.members?.forEach((m: any) => {
            if (m.userId !== currentUserId) {
              uniqueUserIds.add(m.userId);
            }
          });
        });

        const profiles: Record<string, any> = {};
        await Promise.all(
          Array.from(uniqueUserIds).map(async (userId) => {
            try {
              const profileRes = await getPublicProfile(userId);
              profiles[userId] = profileRes?.success
                ? profileRes.data
                : { fullName: "Unknown User" };
            } catch (e) {
              profiles[userId] = { fullName: "Unknown User" };
            }
          }),
        );
        setMemberProfiles(profiles);
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const timeout = setTimeout(() => {
      const socket = socketService.getSocket();
      if (!socket) return;

      const handleNewMessage = (message: any) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === message.conversationId);
          if (index > -1) {
            const conv = { ...prev[index] };
            conv.updatedAt = message.createdAt;
            conv.messages = [message];
            const newConversations = [...prev];
            newConversations.splice(index, 1);
            newConversations.unshift(conv);
            return newConversations;
          }
          return prev;
        });
      };

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
      };
    }, 500); // Allow time for layout to connect socket

    return () => clearTimeout(timeout);
  }, [currentUserId]);

  const handleSelectConversation = (conv: any) => {
    dispatch(setActiveConversation(conv));
    dispatch(setMemberProfilesAction(memberProfiles));
    if (onSelectChat) onSelectChat();
  };

  const handleNewConversation = async (newConversation: any) => {
    // 1. Add to top of conversations list (avoid duplicates)
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === newConversation.id);
      if (exists) return prev;
      return [newConversation, ...prev];
    });

    // 2. Fetch profiles for new members not yet in memberProfiles
    const newProfiles: Record<string, UserProfileResponse> = {};
    const membersToFetch = (newConversation.members || []).filter(
      (m: any) => m.userId !== currentUserId && !memberProfiles[m.userId],
    );

    await Promise.all(
      membersToFetch.map(async (m: any) => {
        try {
          const res = await getPublicProfile(m.userId);
          newProfiles[m.userId] = res?.success
            ? res.data
            : { fullName: "Unknown User" };
        } catch {
          newProfiles[m.userId] = { fullName: "Unknown User" } as any;
        }
      }),
    );

    // 3. Update local state + Redux store
    const mergedProfiles = { ...memberProfiles, ...newProfiles };
    setMemberProfiles(mergedProfiles);
    dispatch(setActiveConversation(newConversation));
    dispatch(setMemberProfilesAction(mergedProfiles));

    // 4. Navigate to the new conversation
    router.push(`/chat?id=${newConversation.id}`);

    if (onSelectChat) onSelectChat();
  };

  const handleAcceptInvitation = async (conversationId: string) => {
    // Refresh conversations list to include the new one
    try {
      const response = await getUserConversations();
      const data = response?.success ? response.data : [];
      setConversations(data);

      const newConv = data.find((c: any) => c.id === conversationId);
      if (newConv) {
        dispatch(setActiveConversation(newConv));
        router.push(`/chat?id=${newConv.id}`);
        if (onSelectChat) onSelectChat();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === "all") return true;
    if (activeTab === "personal") return conv.type === "DIRECT";
    if (activeTab === "groups") return conv.type === "GROUP";
    return true;
  });

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Đoạn chat</h2>
          <div className="flex gap-2">
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
            {filteredConversations.map((conv) => (
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
