import { Clock3, ShieldCheck, Video, XCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingParticipantStatus, MeetingResponse } from "../../types/meeting.types";
import { canRequestMeetingJoin } from "../../utils/meeting.utils";

interface MeetingJoinStatePanelProps {
  meeting: MeetingResponse;
  participantStatus: MeetingParticipantStatus | null;
  isRequestingJoin: boolean;
  onRequestJoin: () => void;
}

export function MeetingJoinStatePanel({
  meeting,
  participantStatus,
  isRequestingJoin,
  onRequestJoin,
}: MeetingJoinStatePanelProps) {
  const intl = useAppIntl();
  const stateIcon =
    participantStatus === MeetingParticipantStatus.REQUESTED ? (
      <Clock3 className="h-7 w-7 text-amber-600" />
    ) : participantStatus === MeetingParticipantStatus.REJECTED ? (
      <XCircle className="h-7 w-7 text-red-600" />
    ) : (
      <ShieldCheck className="h-7 w-7 text-blue-600" />
    );
  const stateMessageId =
    participantStatus === MeetingParticipantStatus.REQUESTED
      ? "meeting.requestWaiting"
      : participantStatus === MeetingParticipantStatus.REJECTED
        ? "meeting.requestRejected"
        : meeting.allowJoinWithoutApproval
          ? "meeting.openJoinReady"
          : "meeting.approvalJoinReady";

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50">
            <Video className="h-6 w-6 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">
              {intl.formatMessage({ id: "meeting.instantMeetingName" })}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {intl.formatMessage({
                id: meeting.allowJoinWithoutApproval
                  ? "meeting.openAccess"
                  : "meeting.approvalRequired",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          {stateIcon}
          <div>
            <p className="text-base font-bold text-slate-900">
              {intl.formatMessage({ id: stateMessageId })}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {intl.formatMessage({
                id: "meeting.videoPlaceholderDescription",
              })}
            </p>
          </div>
        </div>

        {canRequestMeetingJoin(meeting) ? (
          <button
            type="button"
            onClick={onRequestJoin}
            disabled={isRequestingJoin}
            className="h-10 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRequestingJoin
              ? intl.formatMessage({ id: "meeting.requestingJoin" })
              : intl.formatMessage({ id: "meeting.requestJoin" })}
          </button>
        ) : null}
      </div>
    </section>
  );
}
