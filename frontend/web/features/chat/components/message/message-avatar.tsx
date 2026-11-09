import { UserAvatar } from "@/components/common/user-avatar";

import { FaKey } from "react-icons/fa";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfileSnapshotResponse } from "../../types/chat.types";
import { Button } from "@/components/ui/button";

interface MessageAvatarProps {
  showAvatar: boolean;
  isBot?: boolean;
  senderName: string;
  senderProfile: UserProfileSnapshotResponse | null;
  memberRole?: "ADMIN" | "MEMBER";
  spaceCreatorId?: string | null;
  onClick: () => void;
}

export default function MessageAvatar({
  showAvatar,
  isBot = false,
  senderName,
  senderProfile,
  memberRole,
  spaceCreatorId,
  onClick,
}: MessageAvatarProps) {
  const isCreator =
    senderProfile?.userId && senderProfile.userId === spaceCreatorId;

  return (
    <Button variant="unstyled"
      type="button"
      disabled={isBot || !showAvatar}
      tabIndex={showAvatar && !isBot ? 0 : -1}
      onClick={showAvatar ? onClick : undefined}
      className={cn(
        "w-9 h-9 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-semibold mt-1 disabled:opacity-100",
        showAvatar && !isBot &&
          "bg-muted cursor-pointer hover:ring-2 hover:ring-ring transition-all",
        showAvatar && isBot && "bg-info-soft text-info-content ring-1 ring-border",
      )}
      aria-label={showAvatar ? isBot ? senderName : `Open ${senderName}'s profile` : undefined}
    >
      {showAvatar && isBot ? <Bot className="size-5 text-info-content" aria-hidden="true" /> : showAvatar ? (
        <span className="relative inline-block">
          <UserAvatar
            src={senderProfile?.avatarUrl}
            alt={senderName}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
          {isCreator ? (
            <span
              className="absolute -bottom-1 -right-1 bg-warning text-warning-foreground rounded-full p-0.5 border border-border flex items-center justify-center h-4 w-4"
              title="Owner"
            >
              <FaKey size={8} />
            </span>
          ) : memberRole === "ADMIN" ? (
            <span
              className="absolute -bottom-1 -right-1 bg-muted text-muted-foreground rounded-full p-0.5 border border-border flex items-center justify-center h-4 w-4"
              title="Admin"
            >
              <FaKey size={8} />
            </span>
          ) : null}
        </span>
      ) : null}
    </Button>
  );
}
