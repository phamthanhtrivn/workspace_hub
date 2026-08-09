import React, { useMemo } from "react";
import Image from "next/image";
import { BellOff, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";
import { ChatProfilesMap, ConversationResponse } from "../../types/chat.types";

type DirectConversationListItem = ConversationResponse & {
  unreadCount?: number;
  hasMention?: boolean;
  hasUnreadThread?: boolean;
};

interface DirectConversationItemProps {
  conversation: DirectConversationListItem;
  currentUserId: string | null;
  memberProfiles: ChatProfilesMap;
  isLoadingProfile?: boolean;
  isActive?: boolean;
  onClick: (conversation: DirectConversationListItem) => void;
}

const DirectConversationItem = React.memo(function DirectConversationItem({
  conversation,
  currentUserId,
  memberProfiles,
  isLoadingProfile = false,
  isActive,
  onClick,
}: DirectConversationItemProps) {
  const otherMember = useMemo(() => {
    return conversation.members?.find(
      (member) => member.userId !== currentUserId,
    );
  }, [conversation.members, currentUserId]);

  const profile = otherMember ? memberProfiles[otherMember.userId] : null;
  const currentMember = useMemo(() => {
    return conversation.members?.find(
      (member) => member.userId === currentUserId,
    );
  }, [conversation.members, currentUserId]);

  const isDirectProfileLoading =
    !!otherMember && !profile && isLoadingProfile;
  const name = profile?.fullName || "User";
  const avatarUrl = profile?.avatarUrl;
  const isMuted = currentMember?.muted || false;
  const unreadCount = conversation.unreadCount ?? 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 mx-1 my-0.5 rounded-xl cursor-pointer transition-all duration-200 select-none relative group",
        isActive
          ? "bg-blue-50/75 border-l-4 border-blue-600 text-blue-900 font-bold pl-2 shadow-[0_2px_8px_-3px_rgba(37,99,235,0.12)]"
          : "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
      )}
      onClick={() => onClick(conversation)}
    >
      <div className="flex items-center min-w-0 gap-2.5 flex-1">
        <div className="relative shrink-0">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-50 to-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-slate-200/60 shadow-sm transition-transform duration-200 group-hover:scale-105">
            {isDirectProfileLoading ? (
              <span className="h-full w-full animate-pulse rounded-full bg-slate-200" />
            ) : avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={28}
                height={28}
                className="rounded-full animate-fade-in object-cover"
              />
            ) : (
              <User size={13} className="text-slate-400" />
            )}
          </div>
          <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white" />
        </div>

        <span
          className={cn(
            "text-[13px] font-semibold truncate tracking-tight transition-colors duration-150",
            isActive
              ? "text-blue-900"
              : "text-slate-700 group-hover:text-slate-900",
            unreadCount > 0 && "font-black",
          )}
        >
          {isDirectProfileLoading ? (
            <span className="block h-3 w-28 animate-pulse rounded bg-slate-200" />
          ) : (
            name
          )}
        </span>

        {isMuted && (
          <BellOff size={11} className="text-slate-400/80 shrink-0 ml-1" />
        )}
      </div>

      <div className="flex items-center justify-end shrink-0 pl-1">
        {conversation.hasMention && (
          <span className="text-blue-600 font-bold text-xs mr-1 animate-bounce">
            @
          </span>
        )}
        {unreadCount > 0 ? (
          <div
            className={cn(
              "text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex items-center justify-center shadow-sm",
              isMuted ? "bg-slate-400" : "bg-red-500",
            )}
          >
            {unreadCount > MAX_UNREAD_COUNT
              ? "99+"
              : unreadCount}
          </div>
        ) : conversation.hasUnreadThread ? (
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50"
            title="New replies in thread"
          />
        ) : null}
      </div>
    </div>
  );
});

export default DirectConversationItem;
