import React, { useMemo } from "react";
import { User, Users } from "lucide-react";
import Image from "next/image";
import { formatConversationTime } from "@/lib/date";
import MessageSnippet from "../message/message-snippet";

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

  const latestMessage = conv.messages?.[0];

  const time = useMemo(() => {
    return latestMessage
      ? formatConversationTime(latestMessage.createdAt)
      : formatConversationTime(conv.updatedAt || conv.createdAt || Date.now());
  }, [latestMessage, conv.updatedAt, conv.createdAt]);

  return (
    <div
      className={`flex items-center p-3 rounded-xl cursor-pointer transition ${
        isActive
          ? "bg-blue-100 border border-blue-200"
          : "hover:bg-gray-50 border border-transparent"
      }`}
      onClick={() => onClick(conv)}
    >
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200  rounded-full flex items-center justify-center font-bold text-lg overflow-hidden">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={44}
              height={44}
              className="rounded-full"
            />
          ) : isDirect ? (
            <User size={22} className="text-gray-400" />
          ) : (
            <Users size={22} className="text-gray-400" />
          )}
        </div>
      </div>
      <div className="ml-3 flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3
            className={`truncate ${conv.unreadCount ? "text-sm font-bold text-gray-900" : "text-sm font-semibold text-gray-800"}`}
          >
            {name}
          </h3>
          <span
            className={`text-xs ${conv.unreadCount ? "text-blue-600 font-semibold" : "text-gray-500"}`}
          >
            {time}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <MessageSnippet
              latestMessage={latestMessage}
              currentUserId={currentUserId}
              isDirect={isDirect}
              memberProfiles={memberProfiles}
              isUnread={conv.unreadCount > 0}
            />
          </div>
          {conv.hasMention && (
            <span className="text-blue-600 font-semibold">@</span>
          )}
          {conv.unreadCount > 0 && (
            <div className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex items-center justify-center gap-0.5">
              <span>{conv.unreadCount > 99 ? "99+" : conv.unreadCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ConversationItem;
