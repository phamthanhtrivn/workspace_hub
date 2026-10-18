import { useState } from "react";
import { ArrowLeft, Globe, Hash, Info, Search, User, Video } from "lucide-react";
import { useActiveChat } from "../../hooks/useChatQueries";
import { useQuery } from "@tanstack/react-query";
import { getSpaceDetails } from "../../api/chat.api";
import { chatKeys } from "../../types/chat.constant";
import ChannelMembersModal from "../modals/channel/channel-members-modal";
import { useCreateInstantMeeting } from "@/features/meeting/hooks/useCreateInstantMeeting";
import StartMeetingConfirmModal from "../modals/start-meeting-confirm-modal";
import { Button } from "@/components/ui/button";


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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const { createMeeting, isCreating } = useCreateInstantMeeting();

  const spaceId =
    activeChannel && "spaceId" in activeChannel
      ? activeChannel.spaceId
      : undefined;

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(spaceId || ""),
    queryFn: async () => (await getSpaceDetails(spaceId!)).data,
    enabled: !!spaceId,
  });

  const displayName =
    activeChannel?.name || "Channel";
  const memberCount = activeChannel?.members?.length || 0;
  const isDefaultChannel =
    !!activeChannel && "isDefault" in activeChannel && activeChannel.isDefault;

  const handleStartMeeting = () => {
    if (activeChannel?.id) {
      createMeeting({
        channelId: activeChannel.id,
        title: `Meeting - #${displayName}`,
        cameraEnabled: true,
        microphoneEnabled: true,
        autoAdmin: true,
        chatEnabled: true,
      });
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="min-w-0 shrink-0 py-2 px-3 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card z-10">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onBack && (
          <Button variant="unstyled" aria-label="Back"
            className="@min-[720px]/messages:hidden shrink-0 p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-full transition"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </Button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center font-semibold overflow-hidden shrink-0">
            {isDefaultChannel ? (
              <Globe size={20} className="text-muted-foreground" />
            ) : (
              <Hash size={20} className="text-muted-foreground" />
            )}
          </div>

          <h2 className="font-semibold text-foreground truncate">
            {displayName}
          </h2>
          <Button variant="unstyled"
            type="button"
            onClick={() => setIsMembersModalOpen(true)}
            disabled={!activeChannel?.id}
            className="inline-flex cursor-pointer items-center gap-1 rounded-control bg-accent px-2 py-1 text-xs text-muted-foreground transition hover:bg-border disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Members (${memberCount})`}
          >
            <span>
              <User className="w-3 h-3" />
            </span>{" "}
            <span>{memberCount}</span>
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1 text-muted-foreground">
        <Button variant="unstyled"
          className="cursor-pointer p-2 hover:bg-muted hover:text-info-content rounded-full transition"
          onClick={onOpenSearch}
          title="Search"
        >
          <Search size={20} />
        </Button>
        <Button variant="unstyled"
          className="cursor-pointer p-2 hover:bg-muted hover:text-info-content rounded-full transition disabled:opacity-50"
          onClick={() => setIsConfirmModalOpen(true)}
          disabled={isCreating || !activeChannel?.id}
          title="Start instant meeting"
        >
          <Video size={20} />
        </Button>
        <div className="w-px h-6 bg-accent mx-1" />
        <Button variant="unstyled"
          className="cursor-pointer p-2 hover:bg-muted hover:text-info-content rounded-full transition"
          onClick={onToggleRightPanel}
          title="Channel info"
        >
          <Info size={20} />
        </Button>
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
      <StartMeetingConfirmModal
        isOpen={isConfirmModalOpen}
        isCreating={isCreating}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleStartMeeting}
        targetName={`#${displayName}`}
      />
    </div>
  );
}
