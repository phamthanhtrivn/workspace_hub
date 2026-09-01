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
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface UseShareToChatProps {
  item: DocumentItem | null;
  onSuccess: () => void;
}

export function useShareToChat({ item, onSuccess }: UseShareToChatProps) {
  const intl = useAppIntl();
  const [activeTab, setActiveTab] = useState<ShareTabType>(
    ShareTabType.CHANNEL,
  );
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [introMessage, setIntroMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeSpaceIdFromStore = useAppSelector(
    (state) => state.chat.activeSpaceId,
  );

  const isOwner = useMemo(() => {
    return item && currentUserId ? item.ownerUserId === currentUserId : false;
  }, [item, currentUserId]);

  // Fetch user spaces
  const { data: spaces } = useSpacesQuery(currentUserId);

  // Set default active space ID
  useEffect(() => {
    if (activeSpaceIdFromStore) {
      setSelectedSpaceId(activeSpaceIdFromStore);
    } else if (spaces && spaces.length > 0) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, activeSpaceIdFromStore]);

  // Fetch channels in selected space
  const { data: channelsData } = useSpaceChannelsQuery(
    selectedSpaceId,
    undefined,
    {
      enabled:
        !!item && activeTab === ShareTabType.CHANNEL && !!selectedSpaceId,
    },
  );
  const channels = channelsData?.channels || [];

  // Fetch direct messages (conversations)
  const { data: directConversationsData } =
    useDirectMessagesQuery(currentUserId);
  const directConversations = directConversationsData?.directMessages || [];

  // Reset selected chat ID on tab/space change
  useEffect(() => {
    setSelectedChatId("");
  }, [activeTab, selectedSpaceId]);

  const handleShare = async () => {
    if (!item) return;

    if (!selectedChatId) {
      toast.error(intl.formatMessage({ id: "documents.selectTargetChat" }));
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === ShareTabType.CHANNEL) {
        // 1. Fetch channel members
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

          // 2. Check permissions for these emails
          const unauthorizedEmails = await documentsApi.checkPermissions(
            item.id,
            emails,
          );

          if (unauthorizedEmails.length > 0 && isOwner) {
            // 3. Prompt owner to grant Viewer permission
            const swalResult = await Swal.fire({
              title: intl.formatMessage({
                id: "documents.permissionsRequired",
              }),
              text: intl.formatMessage(
                { id: "documents.channelMembersNoPermission" },
                { count: unauthorizedEmails.length },
              ),
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: intl.formatMessage({
                id: "documents.grantAndShare",
              }),
              cancelButtonText: intl.formatMessage({
                id: "documents.shareOnly",
              }),
              customClass: {
                confirmButton:
                  "bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-5 rounded-xl mr-3 cursor-pointer outline-none transition-colors text-sm",
                cancelButton:
                  "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl cursor-pointer outline-none transition-colors text-sm",
              },
              buttonsStyling: false,
            });

            if (swalResult.isConfirmed) {
              await documentsApi.addSharesBatch(
                item.id,
                unauthorizedEmails,
                "VIEWER",
              );
              toast.success(
                intl.formatMessage({
                  id: "documents.viewerAccessGrantedToMembers",
                }),
              );
            }
          }
        }

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
        // Direct conversation sharing
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

      toast.success(intl.formatMessage({ id: "documents.sharedSuccessfully" }));
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(intl.formatMessage({ id: "documents.shareToChatFailed" }));
    } finally {
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
    isSubmitting,
    spaces,
    channels,
    directConversations,
    handleShare,
    currentUserId,
  };
}
