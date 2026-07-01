import React from "react";
import { ArrowLeft, Info, User, Users } from "lucide-react";
import Image from "next/image";
import { useAppSelector } from "@/store/store";

interface ChatHeaderProps {
  onToggleRightPanel: () => void;
  onBack?: () => void;
}

export default function ChatHeader({
  onToggleRightPanel,
  onBack,
}: ChatHeaderProps) {
  const { activeConversation, memberProfiles } = useAppSelector(
    (state) => state.chat,
  );
  const currentUserId = useAppSelector((state) => state.auth.userId);

  const isDirect = activeConversation?.type === "DIRECT";

  let displayName = "Group Chat";
  let displayAvatarUrl = null;

  if (isDirect) {
    const otherMember = activeConversation?.members?.find(
      (m) => m.userId !== currentUserId,
    );
    if (otherMember && memberProfiles?.[otherMember.userId]) {
      const profile = memberProfiles[otherMember.userId];
      displayName = profile.fullName || "User";
      displayAvatarUrl = profile.avatarUrl;
    }
  } else if (activeConversation) {
    displayName = activeConversation.name || "Group Chat";
    displayAvatarUrl = activeConversation.avatarUrl;
  }
  return (
    <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
      <div className="flex items-center gap-2 md:gap-3">
        {onBack && (
          <button
            className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-bold overflow-hidden">
            {displayAvatarUrl ? (
              <Image
                src={displayAvatarUrl}
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : isDirect ? (
              <User size={20} className="text-gray-400" />
            ) : (
              <Users size={20} className="text-gray-400" />
            )}
          </div>
          {isDirect && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">
            {displayName}
          </h2>
          <p className="text-xs text-gray-500">
            {isDirect ? "Đang hoạt động" : `${activeConversation?.members?.length || 0} thành viên`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-gray-500">
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        <button
          className="p-2 hover:bg-gray-100 hover:text-blue-600 rounded-full transition"
          onClick={onToggleRightPanel}
        >
          <Info size={20} />
        </button>
      </div>
    </div>
  );
}
