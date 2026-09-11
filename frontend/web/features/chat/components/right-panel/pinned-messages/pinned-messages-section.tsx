import { ChevronDown, ChevronRight, Pin } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDirectPinnedMessages,
  getPinnedMessages,
  unpinChannelMessage,
} from "../../../api/chat.api";
import { useDirectMessageActions } from "../../../hooks/useDirectMessageActions";
import { ChatScope, chatKeys } from "../../../types/chat.constant";
import SeeAllButton from "../see-all-button";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { toast } from "sonner";

interface PinnedMessagesSectionProps {
  conversationId: string;
  isDirect?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getPinnedPreviewText(message: any, intl: ReturnType<typeof useAppIntl>) {
  if (message.content) return message.content;
  if (message.medias?.length)
    return intl.formatMessage({ id: "chat.attachment" });
  if (message.poll) return intl.formatMessage({ id: "chat.pollPreview" });
  if (message.note) return intl.formatMessage({ id: "chat.notePreview" });
  return intl.formatMessage({ id: "chat.messagePreview" });
}

function getInitial(name?: string | null) {
  return (name?.trim()?.charAt(0) || "U").toUpperCase();
}

export default function PinnedMessagesSection({
  conversationId,
  isDirect = false,
  isExpanded,
  onToggle,
  onSeeAll,
  onJumpToMessage,
}: PinnedMessagesSectionProps) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const { unpinMessage: unpinDirectPinnedMessage } = useDirectMessageActions();

  const { data, isLoading } = useQuery({
    queryKey: chatKeys.pinnedMessagesPreview(
      isDirect ? ChatScope.DIRECT : ChatScope.CHANNEL,
      conversationId,
    ),
    queryFn: async () => {
      const fetchPinnedMessages = isDirect
        ? getDirectPinnedMessages
        : getPinnedMessages;
      const response = await fetchPinnedMessages(conversationId, undefined, 5);
      return response.data;
    },
    enabled: isExpanded && !!conversationId,
    staleTime: 1000 * 60,
  });

  const pinnedMessages = data?.messages || [];

  const handleUnpin = async (messageId: string) => {
    if (isDirect) {
      await unpinDirectPinnedMessage(conversationId, messageId);
      queryClient.setQueryData(
        chatKeys.pinnedMessagesDetail(ChatScope.DIRECT, conversationId),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.filter(
                (message: any) => message.id !== messageId,
              ),
            })),
          };
        },
      );
      return;
    }

    try {
      await unpinChannelMessage(messageId);
    } catch {
      toast.error(intl.formatMessage({ id: "chat.failedUnpinMessage" }));
      return;
    }

    queryClient.setQueryData(
      chatKeys.pinnedMessagesDetail(ChatScope.CHANNEL, conversationId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter(
              (message: any) => message.id !== messageId,
            ),
          })),
        };
      },
    );
    queryClient.invalidateQueries({
      queryKey: chatKeys.pinnedMessagesPreview(
        ChatScope.CHANNEL,
        conversationId,
      ),
    });
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <Pin size={18} className="text-gray-500" />
          {intl.formatMessage({ id: "chat.pinnedMessages" })}
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="text-xs text-gray-400 py-2">
              {intl.formatMessage({ id: "chat.loadingPinnedMessages" })}
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">
              {intl.formatMessage({ id: "chat.noPinnedMessages" })}
            </div>
          ) : (
            <div className="space-y-1">
              {pinnedMessages.map((message: any) => (
                <button
                  key={message.id}
                  onClick={() => onJumpToMessage(message.id)}
                  className="w-full cursor-pointer flex items-start gap-2 rounded-lg p-2 text-left hover:bg-gray-100 transition"
                >
                  {message.senderProfile?.avatarUrl ? (
                    <img
                      src={message.senderProfile.avatarUrl || ""}
                      alt={
                        message.senderProfile.fullName ||
                        intl.formatMessage({ id: "app.user" })
                      }
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                      {getInitial(message.senderProfile?.fullName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-gray-800">
                      {message.senderProfile?.fullName ||
                        intl.formatMessage({ id: "app.user" })}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {getPinnedPreviewText(message, intl)}
                    </span>
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnpin(message.id);
                    }}
                    className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                    title={intl.formatMessage({ id: "chat.unpin" })}
                  >
                    <Pin size={13} className="mt-1 shrink-0 text-blue-500" />
                  </span>
                </button>
              ))}
              {data?.nextCursor && (
                <SeeAllButton onClick={onSeeAll} className="mt-2">
                  {intl.formatMessage({ id: "chat.seeAllPinnedMessages" })}
                </SeeAllButton>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-gray-100 mx-4 my-1" />
    </div>
  );
}
