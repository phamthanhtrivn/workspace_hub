import { User } from "lucide-react";
import Image from "next/image";

interface ConversationItemProps {
  conv: any;
  currentUserId: string | null;
  memberProfiles: Record<string, any>;
  isActive?: boolean;
  isOnline?: boolean;
  onClick: (conv: any) => void;
}

export default function ConversationItem({
  conv,
  currentUserId,
  memberProfiles,
  isActive,
  isOnline,
  onClick,
}: ConversationItemProps) {
  const isDirect = conv.type === "DIRECT";
  const otherMember = isDirect
    ? conv.members?.find((m: any) => m.userId !== currentUserId)
    : null;
  const profile = otherMember ? memberProfiles[otherMember.userId] : null;

  const name = isDirect ? profile?.fullName || "Unknown User" : "Group Chat";
  const avatarUrl = isDirect ? profile?.avatarUrl : null;

  const latestMessage = conv.messages?.[0];
  const time = latestMessage
    ? new Date(latestMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(
        conv.updatedAt || conv.createdAt || Date.now(),
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const snippet = latestMessage
    ? latestMessage.content
    : isDirect
      ? "Bắt đầu nhắn tin ngay..."
      : "Nhóm trò chuyện";

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
          ) : (
            <User size={22} className="text-gray-400" />
          )}
        </div>
        {isDirect && isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      <div className="ml-3 flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline">
          <h3 className="font-semibold text-sm text-gray-800 truncate">
            {name}
          </h3>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{snippet}</p>
      </div>
    </div>
  );
}
