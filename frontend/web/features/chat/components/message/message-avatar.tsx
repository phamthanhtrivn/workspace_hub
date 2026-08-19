import Image from "next/image";
import { User } from "lucide-react";
import { FaKey } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { UserProfileSnapshotResponse } from "../../types/chat.types";

interface MessageAvatarProps {
  showAvatar: boolean;
  senderName: string;
  senderProfile: UserProfileSnapshotResponse | null;
  memberRole?: "ADMIN" | "MEMBER";
  spaceCreatorId?: string | null;
  onClick: () => void;
}

export default function MessageAvatar({
  showAvatar,
  senderName,
  senderProfile,
  memberRole,
  spaceCreatorId,
  onClick,
}: MessageAvatarProps) {
  const isCreator =
    senderProfile?.userId && senderProfile.userId === spaceCreatorId;

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
          {isCreator ? (
            <span
              className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white flex items-center justify-center h-4 w-4 shadow-sm"
              title="Owner"
            >
              <FaKey size={8} />
            </span>
          ) : memberRole === "ADMIN" ? (
            <span
              className="absolute -bottom-1 -right-1 bg-slate-400 text-white rounded-full p-0.5 border border-white flex items-center justify-center h-4 w-4 shadow-sm"
              title="Admin"
            >
              <FaKey size={8} />
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}
