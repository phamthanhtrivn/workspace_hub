import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import {
  useSpacesQuery,
  useSpaceChannelsQuery,
  useDirectMessagesQuery,
  type SpaceChannelsQueryData,
} from "@/features/chat/hooks/useChatQueries";
import { getProjectSpaceStatus } from "@/features/project/api/project.api";
import { ChatEvent } from "@/features/chat/api/chat.events";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import { chatKeys } from "@/features/chat/types/chat.constant";
import type {
  ConversationSetting,
  SpaceChannel,
} from "@/features/chat/types/chat.types";
import type { ChatSocketSettingUpdatedPayload } from "@/features/chat/types/chat-socket.types";
import { documentsApi } from "../api/documents.api";
import {
  getChannelMembers,
  sendChannelMessage,
  sendDirectMessage,
} from "@/features/chat/api/chat.api";
import { DocumentItem } from "../types/documents.types";
import { ShareTabType } from "../types/documents.enums";
import { toast } from "sonner";

interface UseShareToChatProps {
  item: DocumentItem | null;
  onSuccess: () => void;
  projectId?: string;
}

function canShareDocumentToChannel(
  channel: SpaceChannel,
  currentUserId?: string | null,
) {
  if (!currentUserId) return false;

  const currentMember = channel.members?.find(
    (member) => member.userId === currentUserId,
  );
  if (!currentMember) return false;

  if (currentMember.role === SpaceRole.MEMBER) {
    return channel.setting?.allowSendMessage !== false;
  }

  return true;
}

function patchChannelSetting(
  data: SpaceChannelsQueryData | undefined,
  channelId: string,
  setting: ConversationSetting,
) {
  if (!data?.channels) return data;

  let didPatch = false;
  const channels = data.channels.map((channel) => {
    if (channel.id !== channelId) return channel;
    didPatch = true;
    return {
      ...channel,
      setting,
    };
  });

  return didPatch ? { ...data, channels } : data;
}

export function useShareToChat({ item, onSuccess, projectId }: UseShareToChatProps) {
  const [activeTab, setActiveTab] = useState<ShareTabType>(ShareTabType.CHANNEL);
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [introMessage, setIntroMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingUnauthorizedEmails, setPendingUnauthorizedEmails] = useState<string[]>([]);
  const [isPermissionConfirmOpen, setIsPermissionConfirmOpen] = useState(false);

  const queryClient = useQueryClient();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const activeSpaceIdFromStore = useAppSelector((state) => state.chat.activeSpaceId);
  const isProjectDocuments = Boolean(projectId);

  const isOwner = useMemo(() => {
    return item && currentUserId ? item.ownerUserId === currentUserId : false;
  }, [item, currentUserId]);

  const { data: spaces } = useSpacesQuery(isProjectDocuments ? null : currentUserId);
  const { data: projectSpaceStatus, isLoading: isLoadingProjectSpace } = useQuery({
    queryKey: ["projects", projectId, "space-status"],
    queryFn: () => getProjectSpaceStatus(projectId!),
    enabled: isProjectDocuments && !!item,
  });
  const projectSpaceId = projectSpaceStatus?.spaceId ?? "";

  useEffect(() => {
    if (isProjectDocuments) {
      setActiveTab(ShareTabType.CHANNEL);
      setSelectedSpaceId(projectSpaceId);
      return;
    }
    if (activeSpaceIdFromStore) {
      setSelectedSpaceId(activeSpaceIdFromStore);
    } else if (spaces && spaces.length > 0) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, activeSpaceIdFromStore, isProjectDocuments, projectSpaceId]);

  const channelSpaceId = isProjectDocuments ? projectSpaceId : selectedSpaceId;
  const { data: channelsData } = useSpaceChannelsQuery(
    channelSpaceId,
    undefined,
    {
      enabled: !!item && activeTab === ShareTabType.CHANNEL && !!channelSpaceId,
    }
  );
  const channels = useMemo(() => {
    const allChannels = channelsData?.channels || [];
    return allChannels.filter((channel) =>
      canShareDocumentToChannel(channel, currentUserId),
    );
  }, [channelsData?.channels, currentUserId]);

  const { data: directConversationsData } = useDirectMessagesQuery(
    isProjectDocuments ? null : currentUserId,
  );
  const directConversations = directConversationsData?.directMessages || [];

  useEffect(() => {
    setSelectedChatId("");
  }, [activeTab, channelSpaceId]);

  useEffect(() => {
    if (activeTab !== ShareTabType.CHANNEL && !isProjectDocuments) return;
    if (!selectedChatId) return;
    if (channels.some((channel) => channel.id === selectedChatId)) return;
    setSelectedChatId("");
  }, [activeTab, channels, isProjectDocuments, selectedChatId]);

  useEffect(() => {
    if (!item || !accessToken || !channelSpaceId) return;
    if (activeTab !== ShareTabType.CHANNEL && !isProjectDocuments) return;

    const socket = socketService.connect(accessToken);
    const handleChannelSettingUpdated = (
      data: ChatSocketSettingUpdatedPayload,
    ) => {
      const channelId = data.channelId ?? data.chatId;
      if (!channelId || data.eventType === "space_setting_updated") return;
      if (data.spaceId && data.spaceId !== channelSpaceId) return;

      const setting = data.setting as ConversationSetting;
      queryClient.setQueriesData<SpaceChannelsQueryData>(
        { queryKey: chatKeys.allChannels() },
        (oldData) => patchChannelSetting(oldData, channelId, setting),
      );

      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(data.spaceId ?? channelSpaceId),
      });
    };

    socket.on(ChatEvent.CHANNEL_SETTING_UPDATED, handleChannelSettingUpdated);

    return () => {
      socket.off(ChatEvent.CHANNEL_SETTING_UPDATED, handleChannelSettingUpdated);
    };
  }, [
    accessToken,
    activeTab,
    channelSpaceId,
    isProjectDocuments,
    item,
    queryClient,
  ]);

  const executeShare = async (grantAccess: boolean = false) => {
    if (!item || !selectedChatId) return;

    const isSharingToChannel =
      isProjectDocuments || activeTab === ShareTabType.CHANNEL;
    if (
      isSharingToChannel &&
      !channels.some((channel) => channel.id === selectedChatId)
    ) {
      toast.error("You cannot send messages in this channel.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (grantAccess && pendingUnauthorizedEmails.length > 0) {
        await documentsApi.addSharesBatch(item.id, pendingUnauthorizedEmails, "VIEWER");
        toast.success("Viewer access granted to channel members.");
      }

      if (isProjectDocuments || activeTab === ShareTabType.CHANNEL) {
        if (introMessage.trim()) {
          await sendChannelMessage(selectedChatId, {
            content: introMessage,
            type: "TEXT",
          });
        }
        await sendChannelMessage(selectedChatId, {
          content: item.id,
          type: "DOCUMENT",
        });
      } else {
        if (introMessage.trim()) {
          await sendDirectMessage(selectedChatId, {
            content: introMessage,
            type: "TEXT",
          });
        }
        await sendDirectMessage(selectedChatId, {
          content: item.id,
          type: "DOCUMENT",
        });
      }

      toast.success("Document shared to chat successfully!");
      setIsPermissionConfirmOpen(false);
      setPendingUnauthorizedEmails([]);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to share document to chat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    if (!selectedChatId) {
      toast.error("Please select a target space/channel or conversation.");
      return;
    }

    if (isProjectDocuments) {
      await executeShare(false);
      return;
    }

    if (activeTab === ShareTabType.CHANNEL) {
      try {
        const response = await getChannelMembers(selectedChatId);
        if (response.success && response.data) {
          const membersList = response.data;
          const allMembers = [
            ...(membersList.admins || []),
            ...(membersList.members || []),
          ];
          const emails = allMembers
            .map((m) => m.profile?.email)
            .filter((email): email is string => typeof email === "string");

          const unauthorizedEmails = await documentsApi.checkPermissions(item.id, emails);

          if (unauthorizedEmails.length > 0 && isOwner) {
            setPendingUnauthorizedEmails(unauthorizedEmails);
            setIsPermissionConfirmOpen(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to check permissions", err);
      }
    }

    await executeShare(false);
  };

  return {
    activeTab,
    setActiveTab,
    selectedChatId,
    setSelectedChatId,
    selectedSpaceId,
    setSelectedSpaceId,
    introMessage,
    setIntroMessage,
    isSubmitting,
    spaces,
    channels,
    directConversations,
    handleShare,
    executeShare,
    isPermissionConfirmOpen,
    setIsPermissionConfirmOpen,
    pendingUnauthorizedEmails,
    currentUserId,
    isProjectDocuments,
    isLoadingProjectSpace,
    projectSpaceUnavailable: isProjectDocuments && !isLoadingProjectSpace && !projectSpaceId,
  };
}
