import { UserAvatar } from "@/components/common/user-avatar";
import { useId as useControlledPopupId } from "react";

import { IconButton } from "@/components/ui/icon-button";
import React, { useMemo, useRef, useState } from "react";

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
  onViewProfile?: (userId: string) => void;
}

const DirectConversationItem = React.memo(function DirectConversationItem({
  conversation,
  currentUserId,
  isLoadingProfile = false,
  isActive,
  onClick,
  onTogglePin,
  onToggleMute,
  onViewProfile,
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
        "group relative mx-1 my-0.5 flex cursor-pointer select-none items-center justify-between rounded-control px-2.5 py-2 transition-all duration-150",
        isActive
          ? "bg-primary-soft font-semibold text-primary-soft-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary"
        />
      )}
      <Button
        variant="unstyled"
        type="button"
        aria-current={isActive ? "true" : undefined}
        onClick={() => onClick(conversation)}
        className="flex min-w-0 flex-1 items-center gap-2.5 self-stretch text-left"
      >
        <div className="shrink-0">
          <div className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-border bg-info-soft ring-2 ring-background transition-transform duration-150">
            {isDirectProfileLoading ? (
              <span className="h-full w-full animate-pulse rounded-full bg-accent" />
            ) : (
              <UserAvatar
                src={avatarUrl}
                alt="Avatar"
                width={28}
                height={28}
                className="animate-fade-in rounded-full object-cover"
              />
            )}
          </div>
        </div>

        <span
          className={cn(
            "truncate text-[13px] tracking-tight transition-colors duration-150",
            isActive
              ? "font-semibold text-primary-soft-foreground"
              : "font-medium text-foreground",
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
          <BellOff size={11} className="ml-1 shrink-0 text-muted-foreground" />
        )}
      </Button>

      <div className="flex items-center justify-end shrink-0 pl-1 gap-1">
        {isPinned && (
          <Pin
            size={11}
            className="shrink-0 fill-info-content text-info-content"
          />
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
          <IconButton
            aria-expanded={isMenuOpen}
            aria-controls={`${controlledPopupId}-isMenuOpen`}
            aria-haspopup="menu"
            label="Conversation options"
            showTooltip={false}
            size="icon-sm"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((value) => !value);
            }}
            className="rounded-control p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
            title="Conversation options"
          >
            <MoreVertical size={14} />
          </IconButton>

          {isMenuOpen && (
            <AnchoredMenu
              id={`${controlledPopupId}-isMenuOpen`}
              onClose={() => setIsMenuOpen(false)}
              side="bottom"
              align="end"
              aria-label="Conversation actions"
              className="z-30 min-w-[150px] rounded-panel border border-border bg-card py-1 text-xs text-foreground animate-in fade-in zoom-in-95 duration-100 shadow-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem
                closeOnClick={false}

                onClick={() => {
                  onTogglePin?.(conversation, !isPinned);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
              >
                <Pin
                  size={14}
                  className={
                    isPinned ? "fill-info-content text-info-content" : ""
                  }
                />
                <span>{isPinned ? "Unpin" : "Pin"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                closeOnClick={false}

                onClick={() => {
                  onToggleMute?.(conversation, !isMuted);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
              >
                {isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </DropdownMenuItem>
              {otherMember?.userId && onViewProfile && (
                <DropdownMenuItem
                  closeOnClick={false}
                  onClick={() => {
                    onViewProfile(otherMember.userId);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
                >
                  <User size={14} />
                  <span>View profile</span>
                </DropdownMenuItem>
              )}
            </AnchoredMenu>
          )}
        </div>
      </div>
    </div>
  );
});

export default DirectConversationItem;
