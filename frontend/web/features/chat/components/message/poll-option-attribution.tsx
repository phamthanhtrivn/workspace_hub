import { Button } from "@/components/ui/button";
import { POLL_OPTION_ATTRIBUTION } from "../../constants/poll.constants";
import type { UserProfileSnapshotResponse } from "../../types/chat.types";

interface PollOptionAttributionProps {
  createdBy?: string | null;
  currentUserId?: string | null;
  profile?: UserProfileSnapshotResponse | null;
  onUserClick?: (userId: string) => void;
}

export function PollOptionAttribution({
  createdBy,
  currentUserId,
  profile,
  onUserClick,
}: PollOptionAttributionProps) {
  if (!createdBy) return null;

  const isMe = createdBy === currentUserId;
  const creatorName = isMe
    ? POLL_OPTION_ATTRIBUTION.you
    : profile?.fullName?.trim() || profile?.email?.trim() || POLL_OPTION_ATTRIBUTION.unknownUser;

  return (
    <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
      {POLL_OPTION_ATTRIBUTION.addedBy}{" "}
      {!isMe && onUserClick ? (
        <Button
          variant="unstyled"
          type="button"
          className="relative z-30 inline max-w-full whitespace-normal rounded-control text-left font-semibold [overflow-wrap:anywhere] hover:underline"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onUserClick(createdBy);
          }}
        >
          {creatorName}
        </Button>
      ) : creatorName}
    </span>
  );
}
