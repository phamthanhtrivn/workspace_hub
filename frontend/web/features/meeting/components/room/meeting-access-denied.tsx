"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingAccessDeniedProps {
  onBack: () => void;
}

export function MeetingAccessDenied({ onBack }: MeetingAccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[90] grid min-h-[100dvh] place-items-center bg-[#070b12] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/8 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-white">
          Access Denied
        </h1>
        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-300">
          You do not have permission to join this meeting.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <MeetingButton
            type="button"
            tone="ghost"
            controlSize="md"
            onClick={onBack}
            className="bg-white/10 text-white hover:bg-white/15 hover:text-white"
          >
            Back to meetings
          </MeetingButton>
          <MeetingButton
            type="button"
            tone="primary"
            controlSize="md"
            onClick={() => router.push("/chat")}
          >
            Back to Chat
          </MeetingButton>
        </div>
      </div>
    </div>
  );
}
