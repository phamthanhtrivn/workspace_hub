import React, { useMemo } from "react";
import { User, Users } from "lucide-react";
import Image from "next/image";
import { formatConversationTime } from "@/lib/date";
import MessageSnippet from "./message-snippet";

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
        <div className="flex justify-between items-baseline">
          <h3 className="font-semibold text-sm text-gray-800 truncate">
            {name}
          </h3>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <MessageSnippet
          latestMessage={latestMessage}
          currentUserId={currentUserId}
          isDirect={isDirect}
          memberProfiles={memberProfiles}
        />
      </div>
    </div>
  );
});

export default ConversationItem;
