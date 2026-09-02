"use client";

import { Loader2, VideoOff } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export function MeetingRoomLoading({ joinToken }: { joinToken: string }) {
  const intl = useAppIntl();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-white/10 bg-white/8 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <Loader2 className="h-9 w-9 animate-spin text-blue-200" />
        <h1 className="mt-4 text-lg font-black">
          {intl.formatMessage({ id: "meeting.room.joining" })}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-300">
          {intl.formatMessage(
            { id: "meeting.room.token" },
            { token: joinToken },
          )}
        </p>
      </div>
    </div>
  );
}

export function MeetingRoomError({ onBack }: { onBack: () => void }) {
  const intl = useAppIntl();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white/8 px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/16 text-red-200 ring-1 ring-red-300/20">
          <VideoOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-black">
          {intl.formatMessage({ id: "meeting.room.joinFailed" })}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          {intl.formatMessage({ id: "meeting.room.joinFailedDescription" })}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 h-11 rounded-lg bg-white px-5 text-sm font-black text-[#172B4D] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {intl.formatMessage({ id: "meeting.room.backToMeetings" })}
        </button>
      </div>
    </div>
  );
}
