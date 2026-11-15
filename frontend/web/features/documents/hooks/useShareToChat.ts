import {
  logActionError,
  getActionErrorMessage,
} from "@/lib/permission-feedback";
import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { store, useAppSelector } from "@/store/store";
import {
  useSpacesQuery,
  useSpaceChannelsQuery,
  useDirectMessagesQuery,
} from "@/features/chat/hooks/useChatQueries";
import { getProjectSpaceStatus } from "@/features/project/api/project.api";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import type { SpaceChannel } from "@/features/chat/types/chat.types";
import { shareDocumentToChat } from "../utils/share-document-to-chat";
import {
  DOCUMENT_CHAT_SHARE_SUCCESS,
  DOCUMENT_CHAT_SHARE_ERRORS,
} from "../types/document-chat-sharing.constants";
import { DocumentItem } from "../types/documents.types";
import { ShareTabType } from "../types/documents.enums";
import { toast } from "sonner";
import { invalidateDocumentShare } from "../utils/document-cache";

interface UseShareToChatProps {
  item: DocumentItem | null;
  onSuccess: () => void;
  projectId?: string;
  enabled?: boolean;
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

export function useShareToChat({
  item,
  onSuccess,
  projectId,
  enabled = true,
}: UseShareToChatProps) {
  const [requestedActiveTab, setActiveTab] = useState<ShareTabType>(
    ShareTabType.CHANNEL,
  );
  const [chosenChatId, setSelectedChatId] = useState<string>("");
  const [chosenSpaceId, setSelectedSpaceId] = useState<string>("");
  const [introMessage, setIntroMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sharing = useRef(false);

  const queryClient = useQueryClient();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceIdFromStore = useAppSelector(
    (state) => state.chat.activeSpaceId,
  );
  const isProjectDocuments = Boolean(projectId);
  const activeTab = isProjectDocuments
    ? ShareTabType.CHANNEL
    : requestedActiveTab;

  const { data: spaces } = useSpacesQuery(
    !enabled || !item || isProjectDocuments ? null : currentUserId,
  );
  const { data: projectSpaceStatus, isLoading: isLoadingProjectSpace } =
    useQuery({
      queryKey: ["projects", projectId, "space-status"],
      queryFn: () => getProjectSpaceStatus(projectId!),
      enabled: enabled && isProjectDocuments && !!item,
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
      enabled:
        enabled &&
        !!item &&
        activeTab === ShareTabType.CHANNEL &&
        !!channelSpaceId,
    },
  );
  const channels = useMemo(() => {
    const allChannels = channelsData?.channels || [];

    return allChannels.filter((channel) =>
      canShareDocumentToChannel(channel, currentUserId),
    );
  }, [channelsData?.channels, currentUserId]);

  const { data: directConversationsData } = useDirectMessagesQuery(
    !enabled || !item || isProjectDocuments ? null : currentUserId,
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

  const feedbackKey = JSON.stringify([
    currentUserId,
    item?.id,
    chosenChatId,
    activeTab,
    introMessage,
  ]);
  const [feedback, setFeedback] = useState({
    key: "",
    warningCount: 0,
    retry: false,
  });
  const inheritedEditorWarningCount =
    feedback.key === feedbackKey ? feedback.warningCount : 0;
  const canRetry = feedback.key === feedbackKey && feedback.retry;
  const setInheritedEditorWarningCount = (warningCount: number) =>
    setFeedback((previous) => ({
      key: feedbackKey,
      warningCount,
      retry: previous.key === feedbackKey && previous.retry,
    }));
  const setCanRetry = (retry: boolean) =>
    setFeedback((previous) => ({
      key: feedbackKey,
      retry,
      warningCount: previous.key === feedbackKey ? previous.warningCount : 0,
    }));

  const handleShare = async () => {
    if (!item || !selectedChatId || !currentUserId || sharing.current) return;
    sharing.current = true;
    setIsSubmitting(true);
    let accessPrepared = false;
    try {
      const result = await shareDocumentToChat({
        documentId: item.id,
        assertCurrentActor: () => {
          if (store.getState().auth.userId !== currentUserId)
            throw new Error(DOCUMENT_CHAT_SHARE_ERRORS.ACCOUNT_CHANGED);
        },
        onAccessPrepared: () => {
          accessPrepared = true;
        },
        target: {
          type: activeTab,
          chatId: selectedChatId,
          spaceId: channelSpaceId,
        },
        currentUserId,
        introMessage,
        confirmInheritedEditorAccess: inheritedEditorWarningCount > 0,
      });
      if (store.getState().auth.userId !== currentUserId) return;
      if (result.requiresConfirmation) {
        setInheritedEditorWarningCount(result.inheritedEditorCount);

        return;
      }
      setInheritedEditorWarningCount(0);
      setCanRetry(false);
      toast.success(DOCUMENT_CHAT_SHARE_SUCCESS);
      onSuccess();
    } catch (error) {
      if (store.getState().auth.userId !== currentUserId) return;
      setCanRetry(true);
      logActionError(error);
      toast.error(
        getActionErrorMessage(error, "Failed to share document to chat."),
      );
    } finally {
      if (accessPrepared && store.getState().auth.userId === currentUserId)
        await invalidateDocumentShare(queryClient, currentUserId, item.id);
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
    canRetry,
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
