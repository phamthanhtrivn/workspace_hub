"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, ShieldCheck, Video, XCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingSocket } from "../hooks/useMeetingSocket";
import {
  useMeetingJoinInfoQuery,
  useRequestJoinMeetingMutation,
} from "../hooks/useMeetingQueries";
import { MeetingParticipantStatus } from "../types/meeting.types";
import { meetingRoutes } from "../types/meeting.constants";
import {
  canRequestMeetingJoin,
  getMeetingParticipantStatus,
} from "../utils/meeting.utils";

interface MeetingJoinPageProps {
  joinToken: string;
}

export function MeetingJoinPage({ joinToken }: MeetingJoinPageProps) {
  const intl = useAppIntl();
  const meetingQuery = useMeetingJoinInfoQuery(joinToken);
  const meeting = meetingQuery.data?.data;
  const requestJoin = useRequestJoinMeetingMutation(joinToken);
  const participantStatus = getMeetingParticipantStatus(meeting);

  useMeetingSocket(meeting?.id, joinToken);

  const handleRequestJoin = () => {
    if (!meeting) return;
    requestJoin.mutate(meeting.id);
  };

  const stateIcon =
    participantStatus === MeetingParticipantStatus.JOINED ? (
      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
    ) : participantStatus === MeetingParticipantStatus.REQUESTED ? (
      <Clock3 className="h-7 w-7 text-amber-600" />
    ) : participantStatus === MeetingParticipantStatus.REJECTED ? (
      <XCircle className="h-7 w-7 text-red-600" />
    ) : (
      <ShieldCheck className="h-7 w-7 text-blue-600" />
    );

  const stateMessageId =
    participantStatus === MeetingParticipantStatus.JOINED
      ? "meeting.joinedRoom"
      : participantStatus === MeetingParticipantStatus.REQUESTED
        ? "meeting.requestWaiting"
        : participantStatus === MeetingParticipantStatus.REJECTED
          ? "meeting.requestRejected"
          : meeting?.allowJoinWithoutApproval
            ? "meeting.openJoinReady"
            : "meeting.approvalJoinReady";

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[#f5f9fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={meetingRoutes.listPath}
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          {intl.formatMessage({ id: "meeting.backToMeetings" })}
        </Link>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {meetingQuery.isLoading ? (
            <p className="text-sm font-semibold text-slate-500">
              {intl.formatMessage({ id: "meeting.loadingMeeting" })}
            </p>
          ) : !meeting ? (
            <p className="text-sm font-semibold text-slate-500">
              {intl.formatMessage({ id: "meeting.notFound" })}
            </p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {meeting.title}
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
                  onClick={handleRequestJoin}
                  disabled={requestJoin.isPending}
                  className="h-10 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestJoin.isPending
                    ? intl.formatMessage({ id: "meeting.requestingJoin" })
                    : intl.formatMessage({ id: "meeting.requestJoin" })}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
