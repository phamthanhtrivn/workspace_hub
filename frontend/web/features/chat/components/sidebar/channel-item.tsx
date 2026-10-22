import { useId as useControlledPopupId } from "react";

import { IconButton } from "@/components/ui/icon-button";
import React, { useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Globe,
  Hash,
  MoreVertical,
  Pin,
  LogOut,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";
import { ChannelResponse } from "../../types/chat.types";
import { Button } from "@/components/ui/button";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


interface ChannelItemProps {
  channel: ChannelResponse;
  currentUserId: string | null;
  isActive?: boolean;
  onClick: (channel: ChannelResponse) => void;
  onTogglePin?: (channel: ChannelResponse, pinned: boolean) => void;
  onToggleMute?: (channel: ChannelResponse, muted: boolean) => void;
  onLeave?: (channel: ChannelResponse) => void;
  onDelete?: (channel: ChannelResponse) => void;
  canLeave?: boolean;
  canDelete?: boolean;
}

const ChannelItem = React.memo(function ChannelItem({
  channel,
  currentUserId,
  isActive,
  onClick,
  onTogglePin,
  onToggleMute,
  onLeave,
  onDelete,
  canLeave,
  canDelete,
}: ChannelItemProps) {
  const controlledPopupId = useControlledPopupId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentMember = channel.members?.find(
    (member: any) => member.userId === currentUserId,
  );
  const isMuted = currentMember?.muted || false;
  const isPinned = currentMember?.pinned || false;
  const name = channel.name || "Channel";
  const unreadCount = channel.unreadCount ?? 0;



  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 mx-1 my-0.5 rounded-panel cursor-pointer transition-all duration-200 select-none relative group",
        isActive
          ? "bg-primary-soft text-primary-soft-foreground font-semibold"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <Button variant="unstyled" type="button" aria-current={isActive ? "true" : undefined} onClick={() => onClick(channel)} className="flex items-center min-w-0 gap-2.5 flex-1 text-left self-stretch">
        <span
          className={cn(
            "shrink-0 p-1 rounded-lg transition-all duration-150",
            isActive
              ? "bg-info-soft text-info-content"
              : "bg-accent/50 text-muted-foreground group-hover:text-foreground group-hover:bg-accent/80",
          )}
        >
          {channel.isDefault ? (
            <Globe size={13} className="opacity-90" />
          ) : (
            <Hash size={13} />
          )}
        </span>

        <span
          className={cn(
            "text-[13px] font-semibold truncate tracking-tight transition-colors duration-150",
            isActive
              ? "text-info-content"
              : "text-foreground group-hover:text-foreground",
            unreadCount > 0 && "font-semibold",
          )}
        >
          {name}
        </span>

        {isMuted && (
          <BellOff size={11} className="text-muted-foreground shrink-0 ml-1" />
        )}
      </Button>

      <div className="flex items-center justify-end shrink-0 pl-1 gap-1">
        {isPinned && (
          <Pin size={11} className="shrink-0 fill-info-content text-info-content" />
        )}
        {channel.hasMention && (
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
          <IconButton aria-expanded={isMenuOpen} aria-controls={`${controlledPopupId}-isMenuOpen`} aria-haspopup="menu" label="Channel options" showTooltip={false} size="icon-sm"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((value) => !value);
            }}
            className="rounded-control p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
            title="Channel options"
          >
            <MoreVertical size={14} />
          </IconButton>

          {isMenuOpen && (
            <AnchoredMenu id={`${controlledPopupId}-isMenuOpen`} onClose={() => setIsMenuOpen(false)} side="bottom" align="end" aria-label="Channel actions"
              className="z-30 min-w-[150px] rounded-panel border border-border bg-card py-1 text-xs text-foreground animate-in fade-in zoom-in-95 duration-100 shadow-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem closeOnClick={false}

                onClick={() => {
                  onTogglePin?.(channel, !isPinned);
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
                  onToggleMute?.(channel, !isMuted);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-background"
              >
                {isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </DropdownMenuItem>
              {(canLeave || canDelete) && (
                <div className="h-[1px] bg-muted my-1" />
              )}
              {canLeave && (
                <DropdownMenuItem closeOnClick={false}

                  onClick={() => {
                    onLeave?.(channel);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-destructive-content transition hover:bg-destructive-soft/50 font-semibold"
                >
                  <LogOut size={14} />
                  <span>Leave</span>
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem closeOnClick={false}

                  onClick={() => {
                    onDelete?.(channel);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-destructive-content transition hover:bg-destructive-soft/50 font-semibold"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </DropdownMenuItem>
              )}
            </AnchoredMenu>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChannelItem;
