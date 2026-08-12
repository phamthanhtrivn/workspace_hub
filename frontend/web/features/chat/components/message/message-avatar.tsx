import Image from "next/image";
import { Key, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfileResponse } from "../../types/chat.types";

interface MessageAvatarProps {
  showAvatar: boolean;
  senderName: string;
  senderProfile: UserProfileResponse | null;
  memberRole?: "ADMIN" | "MEMBER";
  onClick: () => void;
}

export default function MessageAvatar({
  showAvatar,
  senderName,
  senderProfile,
  memberRole,
  onClick,
}: MessageAvatarProps) {
  return (
    <button
      type="button"
      onClick={showAvatar ? onClick : undefined}
      className={cn(
        "w-9 h-9 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-bold mt-1 mr-2.5",
        showAvatar &&
          "bg-gradient-to-br from-slate-100 to-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all shadow-sm",
      )}
      aria-label={showAvatar ? `Open ${senderName} profile` : undefined}
    >
      {showAvatar ? (
        <span className="relative inline-block">
          {senderProfile?.avatarUrl ? (
            <Image
              src={senderProfile.avatarUrl}
              alt={senderName}
              width={36}
              height={36}
              unoptimized
              className="rounded-full object-cover"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
              <User size={15} className="text-slate-400" />
            </span>
          )}
          {memberRole === "ADMIN" && (
            <span
              className="absolute -bottom-1 -right-1 bg-gray-400 rounded-full p-0.5 border border-white"
              title="Admin"
            >
              <Key size={10} className="text-white" />
            </span>
          )}
        </span>
      ) : null}
    </button>
  );
}
