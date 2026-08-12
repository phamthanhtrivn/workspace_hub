import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bell, BellOff, MoreVertical, Pin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";
import {
  ChatProfilesMap,
  DirectConversationResponse,
} from "../../types/chat.types";

type DirectConversationListItem = DirectConversationResponse & {
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
  onTogglePin?: (conversation: DirectConversationListItem, pinned: boolean) => void;
  onToggleMute?: (conversation: DirectConversationListItem, muted: boolean) => void;
}

const DirectConversationItem = React.memo(function DirectConversationItem({
  conversation,
  currentUserId,
  memberProfiles,
  isLoadingProfile = false,
  isActive,
  onClick,
  onTogglePin,
  onToggleMute,
}: DirectConversationItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  const isPinned = currentMember?.pinned || false;
  const unreadCount = conversation.unreadCount ?? 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

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
        <div className="shrink-0">
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

      <div className="flex items-center justify-end shrink-0 pl-1 gap-1">
        {isPinned && (
          <Pin size={11} className="shrink-0 fill-blue-600 text-blue-600" />
        )}
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
        ) : null}

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((value) => !value);
            }}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            title="Conversation options"
          >
            <MoreVertical size={14} />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-full z-30 mt-1 min-w-[150px] rounded-xl border border-slate-200 bg-white py-1 text-xs text-slate-700 shadow-lg animate-in fade-in zoom-in-95 duration-100"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  onTogglePin?.(conversation, !isPinned);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <Pin size={14} className={isPinned ? "fill-blue-600 text-blue-600" : ""} />
                <span>{isPinned ? "Unpin" : "Pin"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleMute?.(conversation, !isMuted);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                {isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DirectConversationItem;
