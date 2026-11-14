import {
  logActionError,
  getActionErrorMessage,
} from "@/lib/permission-feedback";
import { useState, useEffect, useMemo, useRef } from "react";
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
import { shareDocumentToChat } from "../utils/share-document-to-chat";
import { DOCUMENT_CHAT_SHARE_SUCCESS } from "../types/document-chat-sharing.constants";
import { METADATA_QUERY_KEY } from "@/features/chat/types/document.constants";
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

export function useShareToChat({
  item,
  onSuccess,
  projectId,
}: UseShareToChatProps) {
  const [requestedActiveTab, setActiveTab] = useState<ShareTabType>(
    ShareTabType.CHANNEL,
  );
  const [chosenChatId, setSelectedChatId] = useState<string>("");
  const [chosenSpaceId, setSelectedSpaceId] = useState<string>("");
  const [introMessage, setIntroMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inheritedEditorWarningCount, setInheritedEditorWarningCount] =
    useState(0);
  const sharing = useRef(false);

  const queryClient = useQueryClient();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const activeSpaceIdFromStore = useAppSelector(
    (state) => state.chat.activeSpaceId,
  );
  const isProjectDocuments = Boolean(projectId);
  const activeTab = isProjectDocuments
    ? ShareTabType.CHANNEL
    : requestedActiveTab;

  const { data: spaces } = useSpacesQuery(
    isProjectDocuments ? null : currentUserId,
  );
  const { data: projectSpaceStatus, isLoading: isLoadingProjectSpace } =
    useQuery({
      queryKey: ["projects", projectId, "space-status"],
      queryFn: () => getProjectSpaceStatus(projectId!),
      enabled: isProjectDocuments && !!item,
    });
  const projectSpaceId = projectSpaceStatus?.spaceId ?? "";

  const selectedSpaceId = isProjectDocuments
    ? projectSpaceId
    : spaces?.some((space) => space.id === chosenSpaceId)
      ? chosenSpaceId
      : spaces?.some((space) => space.id === activeSpaceIdFromStore)
        ? activeSpaceIdFromStore!
        : (spaces?.[0]?.id ?? "");

  const channelSpaceId = isProjectDocuments ? projectSpaceId : selectedSpaceId;
  const { data: channelsData } = useSpaceChannelsQuery(
    channelSpaceId,
    undefined,
    {
      enabled: !!item && activeTab === ShareTabType.CHANNEL && !!channelSpaceId,
    },
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

  const [selectionContext, setSelectionContext] = useState({
    activeTab,
    channelSpaceId,
  });
  if (
    selectionContext.activeTab !== activeTab ||
    selectionContext.channelSpaceId !== channelSpaceId
  ) {
    setSelectionContext({ activeTab, channelSpaceId });
    setSelectedChatId("");
  }
  const selectedChatId =
    activeTab === ShareTabType.CHANNEL || isProjectDocuments
      ? channels.some((channel) => channel.id === chosenChatId)
        ? chosenChatId
        : ""
      : chosenChatId;

  useEffect(() => {
    setInheritedEditorWarningCount(0);
  }, [chosenChatId, activeTab, item?.id]);

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
      socket.off(
        ChatEvent.CHANNEL_SETTING_UPDATED,
        handleChannelSettingUpdated,
      );
    };
  }, [
    accessToken,
    activeTab,
    channelSpaceId,
    isProjectDocuments,
    item,
    queryClient,
  ]);

  const handleShare = async () => {
    if (!item || !selectedChatId || !currentUserId || sharing.current) return;
    sharing.current = true;
    setIsSubmitting(true);
    try {
      const result = await shareDocumentToChat({
        documentId: item.id,
        target: {
          type: activeTab,
          chatId: selectedChatId,
          spaceId: channelSpaceId,
        },
        currentUserId,
        introMessage,
        confirmInheritedEditorAccess: inheritedEditorWarningCount > 0,
      });
      if (result.requiresConfirmation) {
        setInheritedEditorWarningCount(result.inheritedEditorCount);
        return;
      }
      setInheritedEditorWarningCount(0);
      toast.success(DOCUMENT_CHAT_SHARE_SUCCESS);
      onSuccess();
    } catch (error) {
      logActionError(error);
      toast.error(
        getActionErrorMessage(error, "Failed to share document to chat."),
      );
    } finally {
      // Refresh document access and shares after a confirmation or send attempt.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["document-sharing", item.id],
        }),
        queryClient.invalidateQueries({ queryKey: [METADATA_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
      ]);
      sharing.current = false;
      setIsSubmitting(false);
    }
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
    inheritedEditorWarningCount,
    clearInheritedEditorWarning: () => setInheritedEditorWarningCount(0),
    isSubmitting,
    spaces,
    channels,
    directConversations,
    handleShare,
    currentUserId,
    isProjectDocuments,
    isLoadingProjectSpace,
    projectSpaceUnavailable:
      isProjectDocuments && !isLoadingProjectSpace && !projectSpaceId,
  };
}
