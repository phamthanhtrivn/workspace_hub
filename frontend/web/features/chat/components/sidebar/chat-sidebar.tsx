"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  MessageSquareText,
  Plus,
  ChevronDown,
  PlusCircle,
  ChevronRight,
  Globe,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SearchUserModal from "../modals/shared/search-user-modal";
import CreateSpaceModal from "../modals/space/create-space-modal";
import CreateChannelModal from "../modals/channel/create-channel-modal";
import BrowseChannelsModal from "../modals/channel/browse-channels-modal";
import SpaceSettingsModal from "../modals/space/space-settings-modal";
import ChannelItem from "./channel-item";
import DirectConversationsSection from "./direct-conversations-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setActiveChannel,
  setActiveDirectMessage,
  setActiveSpaceId,
  setActiveThreadRootMessage,
  setSelectedProfileUserId,
} from "@/store/chat/chat-slice";
import {
  ChatContextType,
  ChannelResponse,
  ConversationResponse,
  DirectConversationResponse,
  FollowedThreadResponse,
  SpaceRole,
  UserProfileResponse,
  UserProfileSnapshotResponse,
  SpaceResponse,
} from "../../types/chat.types";
import {
  CHAT_SIDEBAR_SEARCH_DEBOUNCE_MS,
  ChatSidebarSection,
  MAX_UNREAD_COUNT,
  chatKeys,
} from "../../types/chat.constant";
import {
  sortDirectConversations,
  sortChannelsByPin,
} from "../../utils/direct-conversation-utils";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { getErrorMessage } from "../../types/space-settings/space-settings.types";
import {
  markChannelThreadAsRead,
  markDirectThreadAsRead,
  getSpaceMembers,
  muteChannel,
  pinChannel,
  getSpaceDetails,
  leaveChannel,
  disbandChannel,
} from "../../api/chat.api";
import {
  useActiveChat,
  useSpaceChannelsQuery,
  DirectMessagesQueryData,
  useSpacesQuery,
} from "../../hooks/useChatQueries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  cleanupRemovedSpaceCaches,
  clearChatUnread,
  patchChatMember,
  upsertChannelCache,
  upsertDirectMessageCache,
  updateDirectMessagesCache,
  updateChannelsCache,
} from "../../utils/chat-cache";
import { canMembersCreateChannels } from "../../utils/space-setting-utils";
import FollowedThreadsModal, {
  fetchFollowedThreads,
} from "./followed-threads-modal";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ChatSidebarProps {
  onSelectChat?: () => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const intl = useAppIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] =
    useState(false);
  const [isSpaceSettingsModalOpen, setIsSpaceSettingsModalOpen] =
    useState(false);
  const [isFollowedThreadsModalOpen, setIsFollowedThreadsModalOpen] =
    useState(false);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const [isChannelsDropdownOpen, setIsChannelsDropdownOpen] = useState(false);
  const [isBrowseChannelsModalOpen, setIsBrowseChannelsModalOpen] =
    useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceId = useAppSelector((state) => state.chat.activeSpaceId);
  const { activeChat } = useActiveChat();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelsDropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery.trim(),
    CHAT_SIDEBAR_SEARCH_DEBOUNCE_MS,
  );
  const isSearchingSidebar = debouncedSearchQuery.length > 0;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSpaceDropdownOpen(false);
      }
      if (
        channelsDropdownRef.current &&
        !channelsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsChannelsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: spacesData, refetch: refetchSpaces } =
    useSpacesQuery(currentUserId);
  const spaces = spacesData || [];

  // Automatically select first space if none active
  useEffect(() => {
    if (spaces.length > 0 && !activeSpaceId) {
      const storedSpaceId = localStorage.getItem("selectedSpaceId");
      if (storedSpaceId && spaces.some((space) => space.id === storedSpaceId)) {
        dispatch(setActiveSpaceId(storedSpaceId));
      } else {
        dispatch(setActiveSpaceId(spaces[0].id));
      }
    }
    if (
      activeSpaceId &&
      spaces.length > 0 &&
      !spaces.some((space) => space.id === activeSpaceId)
    ) {
      dispatch(setActiveSpaceId(spaces[0].id));
      dispatch(setActiveConversation(null));
    }
  }, [spaces, activeSpaceId, dispatch]);

  const activeSpace = useMemo(() => {
    return spaces.find((g) => g.id === activeSpaceId) || null;
  }, [spaces, activeSpaceId]);

  const {
    data: channelsData,
    isLoading: loadingChannels,
    refetch: refetchChannels,
  } = useSpaceChannelsQuery(activeSpaceId, debouncedSearchQuery);
  const channels = channelsData?.channels || [];
  const { data: followedThreads = [] } = useQuery({
    queryKey: chatKeys.followedThreads(currentUserId),
    queryFn: fetchFollowedThreads,
    enabled: !!currentUserId,
    staleTime: 1000 * 30,
  });
  const { data: currentSpaceMemberData } = useQuery({
    queryKey: chatKeys.spaceMembers(activeSpaceId),
    queryFn: async () =>
      (await getSpaceMembers(activeSpaceId || "", undefined, 500)).data,
    enabled: !!activeSpace && !!activeSpaceId && !!currentUserId,
    staleTime: 1000 * 30,
  });

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(activeSpaceId),
    queryFn: async () => {
      if (!activeSpaceId) throw new Error("No active space");
      return (await getSpaceDetails(activeSpaceId)).data;
    },
    enabled: !!activeSpaceId,
  });

  const leaveChannelMutation = useMutation({
    mutationFn: (channelId: string) => leaveChannel(channelId),
    onSuccess: (_, channelId) => {
      toast.success("Left channel");
      if (activeChat?.id === channelId) {
        dispatch(setActiveConversation(null));
      }
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
      if (
        spaces.some(
          (space) =>
            space.id === activeSpaceId && space.defaultChannelId === channelId,
        )
      ) {
        dispatch(setActiveSpaceId(null));
      }
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to leave channel")),
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (channelId: string) => disbandChannel(channelId),
    onSuccess: (_, channelId) => {
      toast.success("Channel deleted");
      if (activeChat?.id === channelId) {
        dispatch(setActiveConversation(null));
      }
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to delete channel")),
  });

  const handleLeaveChannel = async (channel: ChannelResponse) => {
    const isDefault = channel.isDefault;
    const actionLabel = isDefault ? "Leave space" : "Leave channel";
    const result = await Swal.fire({
      title: `${actionLabel}?`,
      text: isDefault
        ? "Leaving the default channel will remove you from this space."
        : "Are you sure you want to leave this channel?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#3085d6",
      confirmButtonText: actionLabel,
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      leaveChannelMutation.mutate(channel.id);
    }
  };

  const handleDeleteChannel = async (channel: ChannelResponse) => {
    const result = await Swal.fire({
      title: "Delete channel?",
      text: "This channel and its messages will be permanently deleted.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      deleteChannelMutation.mutate(channel.id);
    }
  };
  const followedThreadsUnreadCount = useMemo(
    () =>
      followedThreads.reduce(
        (count, thread) => count + (thread.unreadReplyCount > 0 ? 1 : 0),
        0,
      ),
    [followedThreads],
  );

  const hydrateDirectMessage = useCallback(
    (
      conversation: ConversationResponse,
      selectedUserId?: string | null,
      selectedProfile?: UserProfileSnapshotResponse | null,
    ): ConversationResponse => {
      if (!selectedUserId || !selectedProfile) return conversation;

      return {
        ...conversation,
        members: conversation.members?.map((member) =>
          member.userId === selectedUserId
            ? { ...member, profile: selectedProfile }
            : member,
        ),
      };
    },
    [],
  );

  const handleSelectSpace = (spaceId: string) => {
    dispatch(setActiveSpaceId(spaceId));
    dispatch(setActiveConversation(null));
    setIsSpaceDropdownOpen(false);
  };

  const handleSelectChannel = useCallback(
    (channel: ChannelResponse) => {
      dispatch(setActiveChannel(channel));

      if (channel.spaceId) {
        updateChannelsCache(
          queryClient,
          channel.id,
          clearChatUnread,
          channel.spaceId,
        );
      }

      if (onSelectChat) onSelectChat();
    },
    [dispatch, onSelectChat, queryClient],
  );

  const handleSelectConversation = useCallback(
    (conv: ConversationResponse) => {
      dispatch(setActiveDirectMessage(conv));

      // Optimistically clear unread count
      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        clearChatUnread,
        conv.id,
      );

      if (onSelectChat) onSelectChat();
    },
    [currentUserId, dispatch, onSelectChat, queryClient],
  );

  const handleNewConversation = useCallback(
    async (
      newConversation: DirectConversationResponse,
      selectedProfile?: UserProfileResponse & { id?: string | null },
    ) => {
      const selectedUserId = selectedProfile?.id;

      if (selectedUserId) {
        queryClient.setQueryData<DirectMessagesQueryData>(
          chatKeys.directMessages(currentUserId),
          (oldData) => {
            if (!oldData) return oldData;
            const conversations = oldData.directMessages || [];
            const exists = conversations.some(
              (conv) => conv.id === newConversation.id,
            );
            const nextConversations = exists
              ? conversations.map((conv) =>
                  conv.id === newConversation.id ? newConversation : conv,
                )
              : [newConversation, ...conversations];

            return {
              ...oldData,
              directMessages: sortDirectConversations(
                nextConversations,
                currentUserId,
              ),
            };
          },
        );
      }

      queryClient.invalidateQueries({
        queryKey: chatKeys.directMessages(currentUserId),
      });
      const hydratedConversation =
        selectedUserId && selectedProfile
          ? hydrateDirectMessage(newConversation, selectedUserId, {
              id: selectedUserId,
              userId: selectedUserId,
              email: selectedProfile.email,
              fullName: selectedProfile.fullName,
              avatarUrl: selectedProfile.avatarUrl,
            })
          : newConversation;

      upsertDirectMessageCache(
        queryClient,
        currentUserId,
        hydratedConversation,
      );
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

    window.addEventListener(
      "REFRESH_CONVERSATIONS",
      handleRefreshConversations,
    );
    return () => {
      window.removeEventListener(
        "REFRESH_CONVERSATIONS",
        handleRefreshConversations,
      );
    };
  }, [currentUserId, handleNewConversation, queryClient]);

  const handleNewSpace = (newSpace: SpaceResponse) => {
    refetchSpaces();
    dispatch(setActiveSpaceId(newSpace.id));
  };

  const handleSpaceDeletedOrLeft = useCallback(
    (spaceId: string) => {
      dispatch(setActiveConversation(null));
      dispatch(setActiveSpaceId(null));
      void cleanupRemovedSpaceCaches(queryClient, spaceId).then(() => {
        queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
      });
    },
    [dispatch, queryClient],
  );

  const handleNewChannel = (newChannel: ChannelResponse) => {
    if (newChannel?.spaceId) {
      upsertChannelCache(queryClient, newChannel);
    }
    refetchChannels();
    handleSelectChannel(newChannel);
  };

  const updateChannelMemberCache = useCallback(
    (
      channelId: string,
      memberPatch: { pinned?: boolean; muted?: boolean },
      spaceId?: string | null,
    ) => {
      updateChannelsCache(
        queryClient,
        channelId,
        (channel) => patchChatMember(channel, currentUserId || "", memberPatch),
        spaceId ?? activeSpaceId,
      );
    },
    [activeSpaceId, currentUserId, queryClient],
  );

  const pinChannelMutation = useMutation({
    mutationFn: ({
      channelId,
      pinned,
    }: {
      channelId: string;
      pinned: boolean;
    }) => pinChannel(channelId, pinned),
    onMutate: async ({ channelId, pinned }) => {
      const queryKey = chatKeys.channels(activeSpaceId);
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      updateChannelMemberCache(channelId, { pinned });
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          chatKeys.channels(activeSpaceId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
    },
  });

  const muteChannelMutation = useMutation({
    mutationFn: ({ channelId, muted }: { channelId: string; muted: boolean }) =>
      muteChannel(channelId, muted),
    onMutate: async ({ channelId, muted }) => {
      const queryKey = chatKeys.channels(activeSpaceId);
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      updateChannelMemberCache(channelId, { muted });
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          chatKeys.channels(activeSpaceId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(activeSpaceId),
      });
    },
  });

  const clearThreadUnreadForChat = useCallback(
    (thread: FollowedThreadResponse) => {
      const queryKey = chatKeys.followedThreads(currentUserId);
      queryClient.setQueryData<FollowedThreadResponse[]>(
        queryKey,
        (oldThreads) => {
          const nextThreads = (oldThreads || []).map((item) =>
            item.rootMessage.id === thread.rootMessage.id
              ? { ...item, unreadReplyCount: 0 }
              : item,
          );
          const hasUnreadInSameChat = nextThreads.some(
            (item) =>
              item.chatId === thread.chatId && item.unreadReplyCount > 0,
          );

          if (!hasUnreadInSameChat) {
            if (thread.chatType === ChatContextType.DIRECT_MESSAGE) {
              updateDirectMessagesCache(
                queryClient,
                currentUserId,
                (directMessage) => ({
                  ...directMessage,
                  hasUnreadThread: false,
                }),
                thread.chatId,
              );
            } else {
              const channel = thread.chat as ChannelResponse;
              updateChannelsCache(
                queryClient,
                thread.chatId,
                (channel) => ({
                  ...channel,
                  hasUnreadThread: false,
                }),
                channel.spaceId,
              );
            }
          }

          return nextThreads;
        },
      );
    },
    [currentUserId, queryClient],
  );

  const handleSelectThread = useCallback(
    async (thread: FollowedThreadResponse) => {
      if (thread.chatType === ChatContextType.DIRECT_MESSAGE) {
        upsertDirectMessageCache(
          queryClient,
          currentUserId,
          thread.chat as DirectConversationResponse,
        );
        dispatch(setActiveDirectMessage(thread.chat));
      } else {
        const channel = thread.chat as ChannelResponse;
        upsertChannelCache(queryClient, channel);
        if (channel.spaceId) {
          dispatch(setActiveSpaceId(channel.spaceId));
        }
        dispatch(setActiveChannel(thread.chat));
      }

      dispatch(
        setActiveThreadRootMessage({
          ...thread.rootMessage,
          chatId: thread.chatId,
          chatType: thread.chatType,
        }),
      );
      clearThreadUnreadForChat(thread);
      void (
        thread.chatType === ChatContextType.DIRECT_MESSAGE
          ? markDirectThreadAsRead(thread.rootMessage.id)
          : markChannelThreadAsRead(thread.rootMessage.id)
      ).finally(() => {
        queryClient.invalidateQueries({
          queryKey: chatKeys.followedThreads(currentUserId),
        });
      });

      if (onSelectChat) onSelectChat();
    },
    [
      clearThreadUnreadForChat,
      currentUserId,
      dispatch,
      onSelectChat,
      queryClient,
    ],
  );

  // Filtered lists based on search
  const joinedChannels = useMemo(() => {
    return sortChannelsByPin(
      channels.filter((channel) =>
        channel.members?.some((m) => m.userId === currentUserId),
      ),
      currentUserId,
    );
  }, [channels, currentUserId]);
  const isActiveSpaceAdmin = useMemo(
    () =>
      [
        ...(currentSpaceMemberData?.admins || []),
        ...(currentSpaceMemberData?.members || []),
      ].some(
        (member) =>
          member.userId === currentUserId && member.role === SpaceRole.ADMIN,
      ),
    [currentSpaceMemberData, currentUserId],
  );
  const spaceNameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    spaces.forEach((s) => {
      if (s?.name) {
        counts[s.name] = (counts[s.name] || 0) + 1;
      }
    });
    return counts;
  }, [spaces]);

  const canCreateChannelInActiveSpace =
    isActiveSpaceAdmin || canMembersCreateChannels(activeSpace);

  useEffect(() => {
    if (!canCreateChannelInActiveSpace && isCreateChannelModalOpen) {
      setIsCreateChannelModalOpen(false);
    }
  }, [canCreateChannelInActiveSpace, isCreateChannelModalOpen]);

  const handleChannelDeleted = useCallback(
    (channelId: string) => {
      if (activeChat?.id === channelId) {
        dispatch(setActiveConversation(null));
      }
      refetchChannels();
    },
    [activeChat?.id, dispatch, refetchChannels],
  );

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
              <ChevronDown
                size={14}
                className="text-slate-400 group-hover:text-slate-600 shrink-0 transition"
              />
            </h2>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1 select-none">
              <span>Space</span>
              {activeSpace &&
                spaceNameCounts[activeSpace.name] > 1 &&
                activeSpace.creatorProfile?.fullName && (
                  <>
                    <span>&bull;</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(
                          setSelectedProfileUserId(
                            activeSpace.createdBy || null,
                          ),
                        );
                      }}
                      className="hover:text-blue-600 hover:underline cursor-pointer normal-case"
                    >
                      {activeSpace.creatorProfile.fullName}
                    </span>
                  </>
                )}
            </span>
          </div>
          <button
            onClick={() => setIsFollowedThreadsModalOpen(true)}
            className="flex items-center justify-between px-3 py-2 mx-1 rounded-xl cursor-pointer transition-all duration-200 select-none group bg-slate-600 text-white hover:bg-slate-900 shadow-sm"
          >
            <span className="flex items-center min-w-0 gap-2.5">
              <MessageSquareText
                size={15}
                className="shrink-0 text-slate-100"
              />
              <span className="text-[13px] font-bold truncate">
                {ChatSidebarSection.THREADS}
              </span>
            </span>
            {followedThreadsUnreadCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0 ml-2.5">
                {followedThreadsUnreadCount > MAX_UNREAD_COUNT
                  ? "99+"
                  : followedThreadsUnreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Dropdown Menu */}
        {isSpaceDropdownOpen && (
          <div className="absolute left-3 right-3 top-[64px] z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 py-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Spaces
            </div>
            <div className="max-h-[min(18rem,55vh)] overflow-y-auto flex flex-col gap-0.5 px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {spaces.map((space) => {
                const hasCollision = spaceNameCounts[space.name] > 1;
                return (
                  <div
                    key={space.id}
                    onClick={() => handleSelectSpace(space.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2",
                      space.id === activeSpaceId
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex gap-2 min-w-0 items-center">
                      <span className="truncate">{space.name}</span>
                      {hasCollision && space.creatorProfile?.fullName && (
                        <div className="flex gap-1 text-[10px] text-slate-400 font-normal truncate">
                          <span>
                            {intl.formatMessage({ id: "chat.createdBy" })}
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSpaceDropdownOpen(false);
                              dispatch(
                                setSelectedProfileUserId(
                                  space.createdBy || null,
                                ),
                              );
                            }}
                            className="hover:text-blue-600 hover:underline cursor-pointer"
                          >
                            {space.creatorProfile.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {spaces.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400 italic">
                  {intl.formatMessage({ id: "chat.noSpacesJoined" })}
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
                {intl.formatMessage({ id: "chat.createNewSpace" })}
              </button>
              {isActiveSpaceAdmin && (
                <button
                  onClick={() => {
                    if (activeSpaceId) {
                      setIsSpaceSettingsModalOpen(true);
                    }
                    setIsSpaceDropdownOpen(false);
                  }}
                  disabled={!activeSpaceId}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none rounded-lg flex items-center gap-2 cursor-pointer transition"
                >
                  <Settings size={14} className="text-slate-400" />
                  {intl.formatMessage({ id: "chat.spaceSettings" })}
                </button>
              )}
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
            placeholder={intl.formatMessage({ id: "chat.searchPlaceholder" })}
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
              {isChannelsExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <span>{intl.formatMessage({ id: "chat.channels" })}</span>
            </button>
            {activeSpaceId && (
              <div className="relative" ref={channelsDropdownRef}>
                <button
                  onClick={() =>
                    setIsChannelsDropdownOpen(!isChannelsDropdownOpen)
                  }
                  className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={intl.formatMessage({ id: "chat.channelOptions" })}
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
                      {intl.formatMessage({ id: "chat.browseChannels" })}
                    </button>
                    {canCreateChannelInActiveSpace && (
                      <button
                        onClick={() => {
                          setIsCreateChannelModalOpen(true);
                          setIsChannelsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Plus size={14} className="text-slate-400" />
                        {intl.formatMessage({ id: "chat.createNewChannel" })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {isChannelsExpanded && (
            <div
              className={cn(
                "pr-1 flex flex-col gap-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full",
                joinedChannels.length > 10 && "max-h-80 overflow-y-auto",
              )}
            >
              {loadingChannels ? (
                <div className="text-[11px] text-slate-400 italic px-3 py-1">
                  {intl.formatMessage({ id: "chat.loadingChannels" })}
                </div>
              ) : joinedChannels.length > 0 ? (
                joinedChannels.map((channel: ChannelResponse) => {
                  const channelMember = channel.members?.find(
                    (m) => m.userId === currentUserId,
                  );
                  const isChannelAdmin =
                    channelMember?.role === SpaceRole.ADMIN;
                  const isCreator = channel.createdBy === currentUserId;
                  const allowMemberDeleteOwnChannel =
                    spaceDetail?.setting?.allowMemberDeleteOwnChannel ?? false;

                  const canDelete =
                    !channel.isDefault &&
                    (isActiveSpaceAdmin ||
                      (isCreator && allowMemberDeleteOwnChannel));

                  const canLeave = !channel.isDefault || !isChannelAdmin;

                  return (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      currentUserId={currentUserId}
                      isActive={activeChat?.id === channel.id}
                      onClick={handleSelectChannel}
                      onTogglePin={(selectedChannel, pinned) =>
                        pinChannelMutation.mutate({
                          channelId: selectedChannel.id,
                          pinned,
                        })
                      }
                      onToggleMute={(selectedChannel, muted) =>
                        muteChannelMutation.mutate({
                          channelId: selectedChannel.id,
                          muted,
                        })
                      }
                      onLeave={handleLeaveChannel}
                      onDelete={handleDeleteChannel}
                      canLeave={canLeave}
                      canDelete={canDelete}
                    />
                  );
                })
              ) : (
                <div className="text-[11px] text-slate-400 italic px-3 py-1">
                  {isSearchingSidebar
                    ? "No channels found"
                    : activeSpaceId
                      ? "No channels yet"
                      : "Select a space to view channels"}
                </div>
              )}
            </div>
          )}
        </div>

        <DirectConversationsSection
          activeConversationId={activeChat?.id}
          currentUserId={currentUserId}
          searchQuery={debouncedSearchQuery}
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
          {activeSpace && (
            <SpaceSettingsModal
              isOpen={isSpaceSettingsModalOpen}
              onClose={() => setIsSpaceSettingsModalOpen(false)}
              space={activeSpace}
              currentUserId={currentUserId}
              onSpaceDeletedOrLeft={handleSpaceDeletedOrLeft}
            />
          )}
          <BrowseChannelsModal
            isOpen={isBrowseChannelsModalOpen}
            onClose={() => setIsBrowseChannelsModalOpen(false)}
            spaceId={activeSpaceId}
            currentUserId={currentUserId}
            isSpaceAdmin={isActiveSpaceAdmin}
            onJoinSuccess={handleNewChannel}
            onDeleteSuccess={handleChannelDeleted}
          />
        </>
      )}
      <SearchUserModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onConversationCreated={handleNewConversation}
      />
      <FollowedThreadsModal
        currentUserId={currentUserId}
        isOpen={isFollowedThreadsModalOpen}
        onClose={() => setIsFollowedThreadsModalOpen(false)}
        onSelectThread={handleSelectThread}
      />
    </div>
  );
}
