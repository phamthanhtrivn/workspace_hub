import { UserAvatar } from "@/components/common/user-avatar";

import { MemberProfilesMap } from "./chat-message.types";
import { cn } from "@/lib/utils";

interface MessageReadReceiptsProps {
  readBy: string[];
  currentUserId?: string | null;
  memberProfiles: MemberProfilesMap;
  align?: "start" | "end";
}

export default function MessageReadReceipts({
  readBy,
  currentUserId,
  memberProfiles,
  align = "end",
}: MessageReadReceiptsProps) {
  const otherReaders = readBy.filter((userId) => userId !== currentUserId);

  if (otherReaders.length === 0) return null;

  return (
    <div className={cn("mt-0.5 flex w-full min-w-0 px-1", align === "end" ? "justify-end" : "justify-start")}>
      <div className="flex items-center gap-1 -space-x-1.5 self-end">
        {otherReaders.slice(0, 5).map((userId) => {
          const readerProfile = memberProfiles[userId];

          return (
            <div
              key={userId}
              className="w-4 h-4 rounded-full bg-accent border-2 border-border overflow-hidden relative cursor-pointer hover:z-10 transition-transform"
              title={`${readerProfile?.fullName || "User"} viewed`}
            >
              <UserAvatar
                src={readerProfile?.avatarUrl}
                alt="Avatar"
                width={16}
                height={16}
                className="w-full h-full object-cover animate-fade-in"
              />
            </div>
          );
        })}
        {otherReaders.length > 5 && (
          <div className="w-4 h-4 rounded-full bg-muted border-2 border-border flex items-center justify-center hover:z-10 relative z-0">
            <span className="text-[7px] text-muted-foreground font-semibold leading-none">
              +{otherReaders.length - 5}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
