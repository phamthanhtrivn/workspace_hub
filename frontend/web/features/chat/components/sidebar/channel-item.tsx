import React, { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Globe, Hash, MoreVertical, Pin, LogOut, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";
import { ChannelResponse } from "../../types/chat.types";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentMember = channel.members?.find(
    (member: any) => member.userId === currentUserId,
  );
  const isMuted = currentMember?.muted || false;
  const isPinned = currentMember?.pinned || false;
  const name = channel.name || "Channel";
  const unreadCount = channel.unreadCount ?? 0;

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
      onClick={() => onClick(channel)}
    >
      <div className="flex items-center min-w-0 gap-2.5 flex-1">
        <span
          className={cn(
            "shrink-0 p-1 rounded-lg transition-all duration-150",
            isActive
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-200/50 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200/80",
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
              ? "text-blue-900"
              : "text-slate-700 group-hover:text-slate-900",
            unreadCount > 0 && "font-black",
          )}
        >
          {name}
        </span>

        {isMuted && (
          <BellOff size={11} className="text-slate-400/80 shrink-0 ml-1" />
        )}
      </div>

      <div className="flex items-center justify-end shrink-0 pl-1 gap-1">
        {isPinned && (
          <Pin size={11} className="shrink-0 fill-blue-600 text-blue-600" />
        )}
        {channel.hasMention && (
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
            {unreadCount > MAX_UNREAD_COUNT ? "99+" : unreadCount}
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
            title="Channel options"
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
                  onTogglePin?.(channel, !isPinned);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <Pin
                  size={14}
                  className={isPinned ? "fill-blue-600 text-blue-600" : ""}
                />
                <span>{isPinned ? "Unpin" : "Pin"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleMute?.(channel, !isMuted);
                  setIsMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                {isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>
              {(canLeave || canDelete) && <div className="h-[1px] bg-slate-100 my-1" />}
              {canLeave && (
                <button
                  type="button"
                  onClick={() => {
                    onLeave?.(channel);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-red-600 transition hover:bg-red-50/50 font-semibold"
                >
                  <LogOut size={14} />
                  <span>Leave</span>
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(channel);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-red-600 transition hover:bg-red-50/50 font-semibold"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChannelItem;
