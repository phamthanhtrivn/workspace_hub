"use client";

import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  MeetingParticipantStatusValue,
  type MeetingParticipantStatus,
} from "../../types/meeting.types";
import { MeetingFullscreenPortal } from "./meeting-fullscreen-overlay";

interface MeetingWaitingApprovalProps {
  status: MeetingParticipantStatus | null;
  onBack: () => void;
}

export function MeetingWaitingApproval({
  status,
  onBack,
}: MeetingWaitingApprovalProps) {
  const intl = useAppIntl();
  const isRejected = status === MeetingParticipantStatusValue.REJECTED;

  return (
    <MeetingFullscreenPortal>
      <div className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-white">
        <section className="w-full max-w-md rounded-lg border border-white/10 bg-[#0d1420] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 text-blue-100 ring-1 ring-white/12">
            {isRejected ? (
              <XCircle className="h-8 w-8 text-red-300" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-blue-200" />
            )}
          </span>
          <h2 className="mt-5 text-xl font-black">
            {intl.formatMessage({
              id: isRejected
                ? "meeting.waiting.rejectedTitle"
                : "meeting.waiting.title",
            })}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            {intl.formatMessage({
              id: isRejected
                ? "meeting.waiting.rejectedDescription"
                : "meeting.waiting.description",
            })}
          </p>
          {!isRejected ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-white/8 px-3 py-2 text-xs font-black text-slate-200 ring-1 ring-white/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              {intl.formatMessage({ id: "meeting.waiting.pending" })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-black text-[#172B4D] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {intl.formatMessage({ id: "meeting.room.backToMeetings" })}
          </button>
        </section>
      </div>
    </MeetingFullscreenPortal>
  );
}
