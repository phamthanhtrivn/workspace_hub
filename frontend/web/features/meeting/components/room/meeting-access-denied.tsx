"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingAccessDeniedProps {
  onBack: () => void;
}

export function MeetingAccessDenied({ onBack }: MeetingAccessDeniedProps) {
  const intl = useAppIntl();
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/8 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-white">
          {intl.formatMessage({ id: "meeting.room.accessDeniedTitle" })}
        </h1>
        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-300">
          {intl.formatMessage({ id: "meeting.room.accessDeniedDescription" })}
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
          >
            {intl.formatMessage({ id: "meeting.room.backToMeetings" })}
          </button>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer shadow-sm"
          >
            {intl.formatMessage({ id: "meeting.room.backToChat" })}
          </button>
        </div>
      </div>
    </div>
  );
}
