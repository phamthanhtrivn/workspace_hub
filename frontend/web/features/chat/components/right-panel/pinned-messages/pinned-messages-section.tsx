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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";


interface PinnedMessagesSectionProps {
  conversationId: string;
  isDirect?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getPinnedPreviewText(message: any) {
  if (message.content) return message.content;
  if (message.medias?.length) return "Attachment";
  if (message.poll) return "Poll";
  if (message.note) return "Note";
  return "Message";
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
      toast.error("Failed to unpin message");
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
      <Button variant="unstyled"
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-background transition"
      >
        <div className="flex items-center gap-3 text-foreground font-medium text-sm">
          <Pin size={18} className="text-muted-foreground" />
          Pinned Messages
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2">
              Loading pinned messages...
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              No pinned messages
            </div>
          ) : (
            <div className="space-y-1">
              {pinnedMessages.map((message: any) => (
                <Button variant="unstyled"
                  key={message.id}
                  onClick={() => onJumpToMessage(message.id)}
                  className="w-full cursor-pointer flex items-start gap-2 rounded-control p-2 text-left hover:bg-muted transition"
                >
                  {message.senderProfile?.avatarUrl ? (
                    <img
                      src={message.senderProfile.avatarUrl || ""}
                      alt={
                        message.senderProfile.fullName || "User"
                      }
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info-soft text-xs font-semibold text-info-content">
                      {getInitial(message.senderProfile?.fullName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {message.senderProfile?.fullName || "User"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {getPinnedPreviewText(message)}
                    </span>
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnpin(message.id);
                    }}
                    className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content transition"
                    title="Unpin"
                  >
                    <Pin size={13} className="mt-1 shrink-0 text-info-content" />
                  </span>
                </Button>
              ))}
              {data?.nextCursor && (
                <SeeAllButton onClick={onSeeAll} className="mt-2">
                  See all pinned messages
                </SeeAllButton>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-muted mx-4 my-1" />
    </div>
  );
}
