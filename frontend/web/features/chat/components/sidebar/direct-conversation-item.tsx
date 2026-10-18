import { useId as useControlledPopupId } from "react";
import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bell, BellOff, MoreVertical, Pin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";
import { DirectConversationResponse } from "../../types/chat.types";
import { Button } from "@/components/ui/button";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


type DirectConversationListItem = DirectConversationResponse & {
  unreadCount?: number;
  hasMention?: boolean;
  hasUnreadThread?: boolean;
};

interface DirectConversationItemProps {
  conversation: DirectConversationListItem;
  currentUserId: string | null;
  isLoadingProfile?: boolean;
  isActive?: boolean;
  onClick: (conversation: DirectConversationListItem) => void;
  onTogglePin?: (
    conversation: DirectConversationListItem,
    pinned: boolean,
  ) => void;
  onToggleMute?: (
    conversation: DirectConversationListItem,
    muted: boolean,
  ) => void;
}

const DirectConversationItem = React.memo(function DirectConversationItem({
  conversation,
  currentUserId,
  isLoadingProfile = false,
  isActive,
  onClick,
  onTogglePin,
  onToggleMute,
}: DirectConversationItemProps) {
  const controlledPopupId = useControlledPopupId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const otherMember = useMemo(() => {
    return conversation.members?.find(
      (member) => member.userId !== currentUserId,
    );
  }, [conversation.members, currentUserId]);

  const profile = otherMember?.profile ?? null;
  const currentMember = useMemo(() => {
    return conversation.members?.find(
      (member) => member.userId === currentUserId,
    );
  }, [conversation.members, currentUserId]);

  const isDirectProfileLoading = !!otherMember && !profile && isLoadingProfile;
  const name = profile?.fullName || "User";
  const avatarUrl = profile?.avatarUrl;
  const isMuted = currentMember?.muted || false;
  const isPinned = currentMember?.pinned || false;
  const unreadCount = conversation.unreadCount ?? 0;



  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 mx-1 my-0.5 rounded-panel cursor-pointer transition-all duration-200 select-none relative group",
        isActive
          ? "bg-primary-soft text-primary-soft-foreground font-semibold"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <Button variant="unstyled" type="button" aria-current={isActive ? "true" : undefined} onClick={() => onClick(conversation)} className="flex items-center min-w-0 gap-2.5 flex-1 text-left self-stretch">
        <div className="shrink-0">
          <div className="w-7 h-7 bg-info-soft rounded-full flex items-center justify-center overflow-hidden border border-border transition-transform duration-200">
            {isDirectProfileLoading ? (
              <span className="h-full w-full animate-pulse rounded-full bg-accent" />
            ) : avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={28}
                height={28}
                className="rounded-full animate-fade-in object-cover"
              />
            ) : (
              <User size={13} className="text-muted-foreground" />
            )}
          </div>
        </div>

        <span
          className={cn(
            "text-[13px] font-semibold truncate tracking-tight transition-colors duration-150",
            isActive
              ? "text-info-content"
              : "text-foreground group-hover:text-foreground",
            unreadCount > 0 && "font-semibold",
          )}
        >
          {isDirectProfileLoading ? (
            <span className="block h-3 w-28 animate-pulse rounded bg-accent" />
          ) : (
            name
          )}
        </span>

        {isMuted && (
          <BellOff size={11} className="text-muted-foreground shrink-0 ml-1" />
        )}
      </Button>

      <div className="flex items-center justify-end shrink-0 pl-1 gap-1">
        {isPinned && (
          <Pin size={11} className="shrink-0 fill-info-content text-info-content" />
        )}
        {conversation.hasMention && (
          <span className="text-info-content font-semibold text-xs mr-1">
            @
          </span>
        )}
        {unreadCount > 0 ? (
          <div
            className={cn(
              "text-primary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex items-center justify-center",
              isMuted ? "bg-muted text-muted-foreground" : "bg-destructive",
            )}
          >
            {unreadCount > MAX_UNREAD_COUNT ? "99+" : unreadCount}
          </div>
        ) : null}

        <div ref={menuRef} className="relative">
          <Button aria-expanded={isMenuOpen} aria-controls={`${controlledPopupId}-isMenuOpen`} aria-haspopup="menu" variant="unstyled"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((value) => !value);
            }}
            className="rounded-control p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
            title="Conversation options"
          >
            <MoreVertical size={14} />
          </Button>

          {isMenuOpen && (
            <AnchoredMenu id={`${controlledPopupId}-isMenuOpen`} onClose={() => setIsMenuOpen(false)} side="bottom" align="end" aria-label="Conversation actions"
              className="z-30 min-w-[150px] rounded-panel border border-border bg-card py-1 text-xs text-foreground animate-in fade-in zoom-in-95 duration-100 shadow-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem closeOnClick={false}

                onClick={() => {
                  onTogglePin?.(conversation, !isPinned);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
              >
                <Pin
                  size={14}
                  className={isPinned ? "fill-info-content text-info-content" : ""}
                />
                <span>{isPinned ? "Unpin" : "Pin"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick={false}

                onClick={() => {
                  onToggleMute?.(conversation, !isMuted);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
              >
                {isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </DropdownMenuItem>
            </AnchoredMenu>
          )}
        </div>
      </div>
    </div>
  );
});

export default DirectConversationItem;
