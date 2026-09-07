"use client";

import Image from "next/image";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { MeetingParticipantProfile } from "../../../types/meeting.types";
import { AvatarFallback } from "../../common/avatar-fallback";

interface MeetingMessageReadReceiptsProps {
  readBy: string[];
  currentUserId?: string | null;
  profilesByUserId: Record<string, MeetingParticipantProfile>;
}

export function MeetingMessageReadReceipts({
  readBy,
  currentUserId,
  profilesByUserId,
}: MeetingMessageReadReceiptsProps) {
  const intl = useAppIntl();
  const otherReaders = readBy.filter((userId) => userId !== currentUserId);

  if (otherReaders.length === 0) return null;

  return (
    <div className="mt-0.5 flex w-full justify-end px-1">
      <div className="-space-x-1.5 flex items-center gap-1 self-end">
        {otherReaders.slice(0, 5).map((userId) => {
          const readerProfile = profilesByUserId[userId];
          const readerName =
            readerProfile?.fullName ||
            readerProfile?.email ||
            intl.formatMessage({ id: "app.user" });

          return (
            <div
              key={userId}
              className="relative h-4 w-4 cursor-pointer overflow-hidden rounded-full border-2 border-[#1f2937] bg-slate-700 shadow-sm transition-transform hover:z-10 hover:scale-105"
              title={intl.formatMessage(
                { id: "meeting.chat.readBy" },
                { names: readerName },
              )}
            >
              {readerProfile?.avatarUrl ? (
                <Image
                  src={readerProfile.avatarUrl}
                  alt={readerName}
                  width={16}
                  height={16}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarFallback
                  label={readerName}
                  className="h-full w-full bg-slate-700 ring-0 shadow-none"
                  iconClassName="h-2.5 w-2.5 text-slate-300"
                />
              )}
            </div>
          );
        })}

        {otherReaders.length > 5 && (
          <div className="relative z-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#1f2937] bg-slate-700 shadow-sm hover:z-10">
            <span className="text-[7px] font-bold leading-none text-slate-200">
              +{otherReaders.length - 5}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
