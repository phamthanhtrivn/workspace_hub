import { useState } from "react";
import { ArrowLeft, Globe, Hash, Info, Search, User } from "lucide-react";
import { useActiveChat } from "../../hooks/useChatQueries";
import { useQuery } from "@tanstack/react-query";
import { getSpaceDetails } from "../../api/chat.api";
import { chatKeys } from "../../types/chat.constant";
import ChannelMembersModal from "../modals/channel/channel-members-modal";

interface ChannelChatHeaderProps {
  onToggleRightPanel: () => void;
  onOpenSearch?: () => void;
  onBack?: () => void;
}

export default function ChannelChatHeader({
  onToggleRightPanel,
  onOpenSearch,
  onBack,
}: ChannelChatHeaderProps) {
  const { activeChat: activeChannel } = useActiveChat();
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const spaceId =
    activeChannel && "spaceId" in activeChannel
      ? activeChannel.spaceId
      : undefined;

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(spaceId || ""),
    queryFn: async () => (await getSpaceDetails(spaceId!)).data,
    enabled: !!spaceId,
  });

  const displayName = activeChannel?.name || "Channel";
  const memberCount = activeChannel?.members?.length || 0;
  const isDefaultChannel =
    !!activeChannel && "isDefault" in activeChannel && activeChannel.isDefault;

  return (
    <div className="py-2 px-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onBack && (
          <button
            className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0">
            {isDefaultChannel ? (
              <Globe size={20} className="text-gray-400" />
            ) : (
              <Hash size={20} className="text-gray-400" />
            )}
          </div>

          <h2 className="font-semibold text-gray-800 truncate">
            {displayName}
          </h2>
          <button
            type="button"
            onClick={() => setIsMembersModalOpen(true)}
            disabled={!activeChannel?.id}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Open ${memberCount} channel members`}
          >
            <span>
              <User className="w-3 h-3" />
            </span>{" "}
            <span>{memberCount}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-gray-500">
        <button
          className="cursor-pointer p-2 hover:bg-gray-100 hover:text-blue-600 rounded-full transition"
          onClick={onOpenSearch}
          title="Search"
        >
          <Search size={20} />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          className="cursor-pointer p-2 hover:bg-gray-100 hover:text-blue-600 rounded-full transition"
          onClick={onToggleRightPanel}
          title="Channel Info"
        >
          <Info size={20} />
        </button>
      </div>
      {activeChannel?.id ? (
        <ChannelMembersModal
          channelId={activeChannel.id}
          fallbackMemberCount={memberCount}
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          spaceCreatorId={spaceDetail?.createdBy}
        />
      ) : null}
    </div>
  );
}
