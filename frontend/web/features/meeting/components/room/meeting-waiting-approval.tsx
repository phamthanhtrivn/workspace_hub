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
      <div className="fixed inset-0 z-[100] flex h-dvh min-h-0 overflow-y-auto py-4 [align-items:safe_center] justify-center bg-card px-4 text-foreground">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-info ring-1 ring-border/12">
            {isRejected ? (
              <XCircle className="h-8 w-8 text-destructive" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-info" />
            )}
          </span>
          <h2 className="mt-5 text-section-title font-semibold">
            {isRejected ? "Request declined" : "Waiting for approval"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
            {isRejected
              ? "A host declined your request to join this meeting."
              : "A host or co-host needs to approve your request before you can enter this meeting."}
          </p>
          {!isRejected ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-border/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              Request sent
            </div>
          ) : null}
          <MeetingButton
            type="button"
            tone="secondary"
            controlSize="lg"
            onClick={onBack}
            className="mt-6 w-full bg-card font-semibold text-foreground hover:bg-muted"
          >
            Back to meetings
          </MeetingButton>
        </section>
      </div>
    </MeetingFullscreenPortal>
  );
}
