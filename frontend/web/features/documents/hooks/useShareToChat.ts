import { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "@/store/store";
import {
  useSpacesQuery,
  useSpaceChannelsQuery,
  useDirectMessagesQuery,
} from "@/features/chat/hooks/useChatQueries";
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
}

export function useShareToChat({ item, onSuccess }: UseShareToChatProps) {
  const [activeTab, setActiveTab] = useState<ShareTabType>(ShareTabType.CHANNEL);
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [introMessage, setIntroMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingUnauthorizedEmails, setPendingUnauthorizedEmails] = useState<string[]>([]);
  const [isPermissionConfirmOpen, setIsPermissionConfirmOpen] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceIdFromStore = useAppSelector((state) => state.chat.activeSpaceId);

  const isOwner = useMemo(() => {
    return item && currentUserId ? item.ownerUserId === currentUserId : false;
  }, [item, currentUserId]);

  const { data: spaces } = useSpacesQuery(currentUserId);

  useEffect(() => {
    if (activeSpaceIdFromStore) {
      setSelectedSpaceId(activeSpaceIdFromStore);
    } else if (spaces && spaces.length > 0) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, activeSpaceIdFromStore]);

  const { data: channelsData } = useSpaceChannelsQuery(
    selectedSpaceId,
    undefined,
    {
      enabled: !!item && activeTab === ShareTabType.CHANNEL && !!selectedSpaceId,
    }
  );
  const channels = channelsData?.channels || [];

  const { data: directConversationsData } = useDirectMessagesQuery(currentUserId);
  const directConversations = directConversationsData?.directMessages || [];

  useEffect(() => {
    setSelectedChatId("");
  }, [activeTab, selectedSpaceId]);

  const executeShare = async (grantAccess: boolean = false) => {
    if (!item || !selectedChatId) return;

    setIsSubmitting(true);
    try {
      if (grantAccess && pendingUnauthorizedEmails.length > 0) {
        await documentsApi.addSharesBatch(item.id, pendingUnauthorizedEmails, "VIEWER");
        toast.success("Viewer access granted to channel members.");
      }

      if (activeTab === ShareTabType.CHANNEL) {
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
  };
}
