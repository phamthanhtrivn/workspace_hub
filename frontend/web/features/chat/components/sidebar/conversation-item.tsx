import React from "react";
import { BellOff, Globe, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UNREAD_COUNT } from "../../types/chat.constant";

interface ConversationItemProps {
  conv: any;
  currentUserId: string | null;
  isActive?: boolean;
  onClick: (conv: any) => void;
}

const ConversationItem = React.memo(function ConversationItem({
  conv,
  currentUserId,
  isActive,
  onClick,
}: ConversationItemProps) {
  const currentMember = conv.members?.find(
    (member: any) => member.userId === currentUserId,
  );
  const isMuted = currentMember?.muted || false;
  const name = conv.name || "Channel";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 mx-1 my-0.5 rounded-xl cursor-pointer transition-all duration-200 select-none relative group",
        isActive
          ? "bg-blue-50/75 border-l-4 border-blue-600 text-blue-900 font-bold pl-2 shadow-[0_2px_8px_-3px_rgba(37,99,235,0.12)]"
          : "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
      )}
      onClick={() => onClick(conv)}
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
          {conv.isDefault ? (
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
            conv.unreadCount > 0 && "font-black",
          )}
        >
          {name}
        </span>

        {isMuted && (
          <BellOff size={11} className="text-slate-400/80 shrink-0 ml-1" />
        )}
      </div>

      <div className="flex items-center justify-end shrink-0 pl-1">
        {conv.hasMention && (
          <span className="text-blue-600 font-bold text-xs mr-1 animate-bounce">
            @
          </span>
        )}
        {conv.unreadCount > 0 ? (
          <div
            className={cn(
              "text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex items-center justify-center shadow-sm",
              isMuted ? "bg-slate-400" : "bg-red-500",
            )}
          >
            {conv.unreadCount > MAX_UNREAD_COUNT ? "99+" : conv.unreadCount}
          </div>
        ) : conv.hasUnreadThread ? (
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50"
            title="New replies in thread"
          />
        ) : null}
      </div>
    </div>
  );
});

export default ConversationItem;
