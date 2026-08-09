import { useMemo } from "react";
import { ChevronDown, ChevronRight, Pin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBulkProfilesByIds, getPinnedMessages } from "../../api/chat.api";
import { UserProfileResponse } from "../../types/chat.types";

interface PinnedMessagesSectionProps {
  conversationId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getPinnedPreviewText(message: any) {
  if (message.content) return message.content;
  if (message.medias?.length) return "[Attachment]";
  if (message.poll) return "[Poll]";
  if (message.note) return "[Note]";
  return "[Message]";
}

function getInitial(name?: string | null) {
  return (name?.trim()?.charAt(0) || "U").toUpperCase();
}

export default function PinnedMessagesSection({
  conversationId,
  isExpanded,
  onToggle,
  onSeeAll,
  onJumpToMessage,
}: PinnedMessagesSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["pinnedMessagesPreview", conversationId],
    queryFn: async () => {
      const response = await getPinnedMessages(conversationId, undefined, 5);
      return response.data;
    },
    enabled: isExpanded && !!conversationId,
    staleTime: 1000 * 60,
  });

  const pinnedMessages = data?.messages || [];
  const senderIds = useMemo<string[]>(
    () =>
      [
        ...new Set<string>(
          pinnedMessages
            .map((message: any) => message.senderId)
            .filter((senderId: unknown): senderId is string => typeof senderId === "string" && senderId.length > 0),
        ),
      ].sort(),
    [pinnedMessages],
  );

  const { data: profilesResponse } = useQuery({
    queryKey: ["chat-pinned-message-profiles", senderIds],
    queryFn: async () => getBulkProfilesByIds(senderIds),
    enabled: isExpanded && senderIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const profilesById = useMemo(() => {
    const profiles: Record<string, UserProfileResponse> = {};
    if (profilesResponse?.success && Array.isArray(profilesResponse.data)) {
      profilesResponse.data.forEach((profile: UserProfileResponse) => {
        if (profile.id) {
          profiles[profile.id] = profile;
        }
      });
    }
    return profiles;
  }, [profilesResponse]);

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <Pin size={18} className="text-gray-500" />
          Pinned messages
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
            <div className="text-xs text-gray-400 py-2">Loading pinned messages...</div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">No pinned messages</div>
          ) : (
            <div className="space-y-1">
              {pinnedMessages.map((message: any) => (
                <button
                  key={message.id}
                  onClick={() => onJumpToMessage(message.id)}
                  className="w-full cursor-pointer flex items-start gap-2 rounded-lg p-2 text-left hover:bg-gray-100 transition"
                >
                  {profilesById[message.senderId]?.avatarUrl ? (
                    <img
                      src={profilesById[message.senderId].avatarUrl || ""}
                      alt={profilesById[message.senderId].fullName || "User"}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                      {getInitial(profilesById[message.senderId]?.fullName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-gray-800">
                      {profilesById[message.senderId]?.fullName || "User"}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {getPinnedPreviewText(message)}
                    </span>
                  </span>
                  <Pin size={13} className="mt-1 shrink-0 text-blue-500" />
                </button>
              ))}
              {data?.nextCursor && (
                <button
                  onClick={onSeeAll}
                  className="cursor-pointer w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 transition"
                >
                  See all pinned messages
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-gray-100 mx-4 my-1" />
    </div>
  );
}
