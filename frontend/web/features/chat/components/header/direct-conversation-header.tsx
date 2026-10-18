import { useState } from "react";
import { ArrowLeft, Info, Search, User, Video } from "lucide-react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { useActiveChat } from "../../hooks/useChatQueries";
import { useCreateInstantMeeting } from "@/features/meeting/hooks/useCreateInstantMeeting";
import StartMeetingConfirmModal from "../modals/start-meeting-confirm-modal";
import { Button } from "@/components/ui/button";


interface DirectConversationHeaderProps {
  onToggleRightPanel: () => void;
  onOpenSearch?: () => void;
  onBack?: () => void;
}

export default function DirectConversationHeader({
  onToggleRightPanel,
  onOpenSearch,
  onBack,
}: DirectConversationHeaderProps) {
  const { activeChat: activeConversation } = useActiveChat();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dispatch = useAppDispatch();
  const { createMeeting, isCreating } = useCreateInstantMeeting();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const otherMember = activeConversation?.members?.find(
    (member) => member.userId !== currentUserId,
  );
  const otherMemberId = otherMember?.userId ?? null;
  const profile = otherMember?.profile ?? null;
  const isLoadingProfile = false;
  const displayName =
    profile?.fullName ||
    profile?.email ||
    otherMemberId ||
    "User";
  const displayAvatarUrl = profile?.avatarUrl || null;

  const handleStartMeeting = () => {
    if (activeConversation?.id) {
      createMeeting({
        conversationId: activeConversation.id,
        title: `Meeting - ${displayName}`,
        cameraEnabled: true,
        microphoneEnabled: true,
        autoAdmin: true,
        chatEnabled: true,
      });
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="min-h-16 min-w-0 shrink-0 px-3 py-2 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card z-10">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onBack && (
          <Button variant="unstyled" aria-label="Back"
            className="@min-[720px]/messages:hidden shrink-0 p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-full transition"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </Button>
        )}

        <Button variant="unstyled"
          type="button"
          className="relative cursor-pointer shrink-0"
          onClick={() => {
            if (otherMemberId) {
              dispatch(setSelectedProfileUserId(otherMemberId));
            }
          }}
        >
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-semibold overflow-hidden">
            {isLoadingProfile ? (
              <div className="h-full w-full animate-pulse rounded-full bg-accent" />
            ) : displayAvatarUrl ? (
              <Image
                src={displayAvatarUrl}
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <User size={20} className="text-muted-foreground" />
            )}
          </div>
        </Button>

        <div className="min-w-0">
          {isLoadingProfile ? (
            <>
              <div className="mb-1 h-4 w-32 animate-pulse rounded bg-accent" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-foreground truncate">
                {displayName}
              </h2>
              <p className="text-xs text-muted-foreground">
                Direct Message
              </p>
            </>
          )}
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
          disabled={isCreating || !activeConversation?.id}
          title="Start instant meeting"
        >
          <Video size={20} />
        </Button>
        <div className="w-px h-6 bg-accent mx-1" />
        <Button variant="unstyled"
          className="cursor-pointer p-2 hover:bg-muted hover:text-info-content rounded-full transition"
          onClick={onToggleRightPanel}
          title="Conversation info"
        >
          <Info size={20} />
        </Button>
      </div>

      <StartMeetingConfirmModal
        isOpen={isConfirmModalOpen}
        isCreating={isCreating}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleStartMeeting}
        targetName={displayName}
      />
    </div>
  );
}
