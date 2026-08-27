"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingSocket } from "../../hooks/realtime/use-meeting-socket";
import {
  useMeetingJoinInfoQuery,
  useRequestJoinMeetingMutation,
} from "../../hooks/queries/use-meeting-queries";
import { MeetingParticipantStatus } from "../../types/meeting.types";
import { getMeetingParticipantStatus } from "../../utils/meeting.utils";
import { MeetingRoomSurface } from "../room/meeting-room-surface";
import { MeetingJoinShell } from "./meeting-join-shell";
import { MeetingJoinStatePanel } from "./meeting-join-state-panel";

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

  if (meetingQuery.isLoading) {
    return (
      <MeetingJoinShell>
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            {intl.formatMessage({ id: "meeting.loadingMeeting" })}
          </p>
        </section>
      </MeetingJoinShell>
    );
  }

  if (!meeting) {
    return (
      <MeetingJoinShell>
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            {intl.formatMessage({ id: "meeting.notFound" })}
          </p>
        </section>
      </MeetingJoinShell>
    );
  }

  if (participantStatus === MeetingParticipantStatus.JOINED) {
    return (
      <MeetingJoinShell wide>
        <div className="mt-4">
          <MeetingRoomSurface meeting={meeting} joinToken={joinToken} />
        </div>
      </MeetingJoinShell>
    );
  }

  return (
    <MeetingJoinShell>
      <MeetingJoinStatePanel
        meeting={meeting}
        participantStatus={participantStatus}
        isRequestingJoin={requestJoin.isPending}
        onRequestJoin={handleRequestJoin}
      />
    </MeetingJoinShell>
  );
}
