"use client";

import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import {
  MeetingParticipantStatusValue,
  type MeetingParticipantStatus,
} from "../../types/meeting.types";
import { MeetingFullscreenPortal } from "./meeting-fullscreen-overlay";
import { MeetingButton } from "../ui/meeting-form-controls";

interface MeetingWaitingApprovalProps {
  status: MeetingParticipantStatus | null;
  onBack: () => void;
}

export function MeetingWaitingApproval({
  status,
  onBack,
}: MeetingWaitingApprovalProps) {
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
            {isRejected ? "Request declined" : "Waiting for approval"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
            {isRejected
              ? "A host declined your request to join this meeting."
              : "A host or co-host needs to approve your request before you can enter this meeting."}
          </p>
          {!isRejected ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-white/8 px-3 py-2 text-xs font-black text-slate-200 ring-1 ring-white/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              Request sent
            </div>
          ) : null}
          <MeetingButton
            type="button"
            tone="secondary"
            controlSize="lg"
            onClick={onBack}
            className="mt-6 w-full bg-white font-black text-[#172B4D] hover:bg-slate-100"
          >
            Back to meetings
          </MeetingButton>
        </section>
      </div>
    </MeetingFullscreenPortal>
  );
}
