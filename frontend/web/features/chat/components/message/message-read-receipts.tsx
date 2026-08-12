import { User } from "lucide-react";
import Image from "next/image";
import { MemberProfilesMap } from "./chat-message.types";

interface MessageReadReceiptsProps {
  readBy: string[];
  currentUserId?: string | null;
  memberProfiles: MemberProfilesMap;
}

export default function MessageReadReceipts({
  readBy,
  currentUserId,
  memberProfiles,
}: MessageReadReceiptsProps) {
  const otherReaders = readBy.filter((userId) => userId !== currentUserId);

  if (otherReaders.length === 0) return null;

  return (
    <div className="flex w-full justify-end px-2 mt-0.5">
      <div className="flex items-center gap-1 -space-x-1.5 self-end">
        {otherReaders.slice(0, 5).map((userId) => {
          const readerProfile = memberProfiles[userId];

          return (
            <div
              key={userId}
              className="w-4 h-4 rounded-full bg-slate-200 border-2 border-white overflow-hidden relative cursor-pointer shadow-sm hover:z-10 transition-transform hover:scale-105"
              title={`${readerProfile?.fullName || "User"} viewed`}
            >
              {readerProfile?.avatarUrl ? (
                <Image
                  src={readerProfile.avatarUrl}
                  alt="Avatar"
                  width={16}
                  height={16}
                  unoptimized
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
                  <User size={10} className="text-slate-400" />
                </div>
              )}
            </div>
          );
        })}
        {otherReaders.length > 5 && (
          <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center hover:z-10 relative z-0 shadow-sm">
            <span className="text-[7px] text-slate-600 font-bold leading-none">
              +{otherReaders.length - 5}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
