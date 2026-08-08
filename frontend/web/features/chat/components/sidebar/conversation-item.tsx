import React, { useMemo } from "react";
import { User, BellOff, Hash, Globe } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conv: any;
  currentUserId: string | null;
  memberProfiles: Record<string, any>;
  isActive?: boolean;
  onClick: (conv: any) => void;
}

const ConversationItem = React.memo(function ConversationItem({
  conv,
  currentUserId,
  memberProfiles,
  isActive,
  onClick,
}: ConversationItemProps) {
  const isDirect = conv.type === "DIRECT";

  const otherMember = useMemo(() => {
    return isDirect
      ? conv.members?.find((m: any) => m.userId !== currentUserId)
      : null;
  }, [isDirect, conv.members, currentUserId]);

  const profile = otherMember ? memberProfiles[otherMember.userId] : null;

  const name = isDirect
    ? profile?.fullName || "Unknown User"
    : conv.name || "Group Chat";

  const avatarUrl = isDirect ? profile?.avatarUrl : conv.avatarUrl;

  const currentMember = useMemo(() => {
    return conv.members?.find((m: any) => m.userId === currentUserId);
  }, [conv.members, currentUserId]);

  const isMuted = currentMember?.muted || false;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-150 select-none",
        isActive
          ? "bg-slate-200/60 text-slate-900 font-medium"
          : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
      )}
      onClick={() => onClick(conv)}
    >
      <div className="flex items-center min-w-0 gap-2 flex-1">
        {isDirect ? (
          // Direct Message Item
          <>
            <div className="relative shrink-0">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={24}
                    height={24}
                    className="rounded-full animate-fade-in"
                  />
                ) : (
                  <User size={12} className="text-gray-400" />
                )}
              </div>
            </div>
            <span className={cn("text-[13px] truncate", conv.unreadCount > 0 && "font-bold text-slate-900")}>
              {name}
            </span>
          </>
        ) : (
          // Channel Item
          <>
            <span className="text-slate-400 shrink-0">
              {conv.isDefault ? (
                <Globe size={14} className="opacity-80" />
              ) : (
                <Hash size={14} />
              )}
            </span>
            <span className={cn("text-[13px] truncate", conv.unreadCount > 0 && "font-bold text-slate-900")}>
              {name}
            </span>
          </>
        )}
        {isMuted && <BellOff size={11} className="text-slate-400 shrink-0 ml-1" />}
      </div>

      {/* Unread indicators */}
      <div className="flex items-center justify-end shrink-0 pl-1">
        {conv.hasMention && (
          <span className="text-blue-600 font-semibold text-xs mr-1">@</span>
        )}
        {conv.unreadCount > 0 ? (
          <div
            className={cn(
              "text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex items-center justify-center",
              isMuted ? "bg-slate-400" : "bg-red-500"
            )}
          >
            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
          </div>
        ) : conv.hasUnreadThread ? (
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
            title="Có phản hồi mới trong luồng"
          />
        ) : null}
      </div>
    </div>
  );
});

export default ConversationItem;
