"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { useMeetingSocket } from "../../hooks/realtime/use-meeting-socket";
import {
  useMeetingJoinInfoQuery,
  useRequestJoinMeetingMutation,
} from "../../hooks/queries/use-meeting-queries";
import { meetingRoutes } from "../../types/meeting.constants";
import {
  MeetingParticipantStatus,
  MeetingStatus,
} from "../../types/meeting.types";
import { getMeetingParticipantStatus } from "../../utils/meeting.utils";
import { MeetingRoomSurface } from "../room/meeting-room-surface";
import { MeetingJoinRoomModal } from "./meeting-join-room-modal";
import { MeetingJoinShell } from "./meeting-join-shell";
import { MeetingWaitingRoomSurface } from "./meeting-waiting-room-surface";

interface MeetingJoinPageProps {
  joinToken: string;
}

export function MeetingJoinPage({ joinToken }: MeetingJoinPageProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const hasHandledMissingMeetingRef = useRef(false);
  const hasHandledEndedMeetingRef = useRef(false);
  const hasHandledRemovedParticipantRef = useRef(false);
  const meetingQuery = useMeetingJoinInfoQuery(joinToken);
  const meeting = meetingQuery.data?.data;
  const requestJoin = useRequestJoinMeetingMutation(joinToken);
  const participantStatus = getMeetingParticipantStatus(meeting);

  const returnToMeetingsAfterEnd = useCallback(() => {
    if (hasHandledEndedMeetingRef.current) return;
    hasHandledEndedMeetingRef.current = true;
    toast.info(intl.formatMessage({ id: "meeting.room.endedToast" }));
    router.replace(meetingRoutes.listPath);
  }, [intl, router]);

  const returnToMeetingsAfterRemoval = useCallback(() => {
    if (hasHandledRemovedParticipantRef.current) return;
    hasHandledRemovedParticipantRef.current = true;
    toast.error(intl.formatMessage({ id: "meeting.room.removedToast" }));
    router.replace(meetingRoutes.listPath);
  }, [intl, router]);
  const handleParticipantRemoved = useCallback(
    (payload: { userId?: string }) => {
      if (payload.userId !== currentUserId) return;
      returnToMeetingsAfterRemoval();
    },
    [currentUserId, returnToMeetingsAfterRemoval],
  );

  useMeetingSocket(meeting?.id, joinToken, {
    onMeetingEnded: returnToMeetingsAfterEnd,
    onParticipantRemoved: handleParticipantRemoved,
  });

  useEffect(() => {
    if (!meetingQuery.isError || hasHandledMissingMeetingRef.current) return;
    if (!isNotFoundError(meetingQuery.error)) return;

    hasHandledMissingMeetingRef.current = true;
    toast.error(intl.formatMessage({ id: "meeting.notFound" }));
    router.replace(meetingRoutes.listPath);
  }, [intl, meetingQuery.error, meetingQuery.isError, router]);

  useEffect(() => {
    if (meeting?.status === MeetingStatus.ENDED) {
      returnToMeetingsAfterEnd();
    }
  }, [meeting?.status, returnToMeetingsAfterEnd]);

  useEffect(() => {
    if (participantStatus === MeetingParticipantStatus.REMOVED) {
      returnToMeetingsAfterRemoval();
    }
  }, [participantStatus, returnToMeetingsAfterRemoval]);

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

  if (meetingQuery.isError && isNotFoundError(meetingQuery.error)) {
    return null;
  }

  if (participantStatus === MeetingParticipantStatus.REMOVED) {
    return null;
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

  if (participantStatus === MeetingParticipantStatus.REQUESTED) {
    return (
      <MeetingJoinShell wide>
        <div className="mt-4">
          <MeetingWaitingRoomSurface meeting={meeting} />
        </div>
      </MeetingJoinShell>
    );
  }

  return (
    <MeetingJoinShell>
      <MeetingJoinRoomModal
        joinToken={joinToken}
        meeting={meeting}
        participantStatus={participantStatus}
        isRequestingJoin={requestJoin.isPending}
        onRequestJoin={handleRequestJoin}
      />
    </MeetingJoinShell>
  );
}

function isNotFoundError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
