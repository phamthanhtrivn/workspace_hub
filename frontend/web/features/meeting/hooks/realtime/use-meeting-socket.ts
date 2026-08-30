"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import { MeetingSocketEvent } from "../../api/meeting-socket.events";
import { meetingKeys } from "../../types/meeting.constants";
import { MeetingSocketPayload } from "../../types/meeting.types";

interface MeetingRealtimeSocket {
  emit: (
    event: MeetingSocketEvent.JOIN_CONTROL_ROOM,
    payload: { meetingId: string },
  ) => void;
  on: (
    event:
      | MeetingSocketEvent.JOIN_REQUESTED
      | MeetingSocketEvent.JOIN_APPROVED
      | MeetingSocketEvent.JOIN_REJECTED
      | MeetingSocketEvent.ACCESS_UPDATED
      | MeetingSocketEvent.PARTICIPANT_LEFT
      | MeetingSocketEvent.PARTICIPANT_ROLE_UPDATED
      | MeetingSocketEvent.PARTICIPANT_REMOVED
      | MeetingSocketEvent.MEETING_ENDED,
    handler: (payload: MeetingSocketPayload) => void,
  ) => void;
  off: (
    event:
      | MeetingSocketEvent.JOIN_REQUESTED
      | MeetingSocketEvent.JOIN_APPROVED
      | MeetingSocketEvent.JOIN_REJECTED
      | MeetingSocketEvent.ACCESS_UPDATED
      | MeetingSocketEvent.PARTICIPANT_LEFT
      | MeetingSocketEvent.PARTICIPANT_ROLE_UPDATED
      | MeetingSocketEvent.PARTICIPANT_REMOVED
      | MeetingSocketEvent.MEETING_ENDED,
    handler: (payload: MeetingSocketPayload) => void,
  ) => void;
}

interface UseMeetingSocketOptions {
  onMeetingEnded?: () => void;
  onParticipantRemoved?: (payload: MeetingSocketPayload) => void;
}

export function useMeetingSocket(
  meetingId?: string,
  joinToken?: string,
  options: UseMeetingSocketOptions = {},
) {
  const queryClient = useQueryClient();
  const { accessToken } = useAppSelector((state) => state.auth);
  const { onMeetingEnded, onParticipantRemoved } = options;

  useEffect(() => {
    if (!accessToken || !meetingId) return;

    const socket = socketService.connect(
      accessToken,
    ) as unknown as MeetingRealtimeSocket;
    const invalidateMeetingData = (payload: MeetingSocketPayload) => {
      if (payload.meetingId !== meetingId) return;

      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requests(meetingId),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    };

    const handleMeetingEvent = (payload: MeetingSocketPayload) => {
      invalidateMeetingData(payload);
    };
    const handleMeetingEnded = (payload: MeetingSocketPayload) => {
      invalidateMeetingData(payload);
      if (payload.meetingId !== meetingId) return;

      onMeetingEnded?.();
    };
    const handleParticipantRemoved = (payload: MeetingSocketPayload) => {
      invalidateMeetingData(payload);
      if (payload.meetingId !== meetingId) return;

      onParticipantRemoved?.(payload);
    };

    socket.emit(MeetingSocketEvent.JOIN_CONTROL_ROOM, { meetingId });
    socket.on(MeetingSocketEvent.JOIN_REQUESTED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.JOIN_APPROVED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.JOIN_REJECTED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.ACCESS_UPDATED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.PARTICIPANT_LEFT, handleMeetingEvent);
    socket.on(MeetingSocketEvent.PARTICIPANT_ROLE_UPDATED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.PARTICIPANT_REMOVED, handleParticipantRemoved);
    socket.on(MeetingSocketEvent.MEETING_ENDED, handleMeetingEnded);

    return () => {
      socket.off(MeetingSocketEvent.JOIN_REQUESTED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.JOIN_APPROVED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.JOIN_REJECTED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.ACCESS_UPDATED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.PARTICIPANT_LEFT, handleMeetingEvent);
      socket.off(
        MeetingSocketEvent.PARTICIPANT_ROLE_UPDATED,
        handleMeetingEvent,
      );
      socket.off(
        MeetingSocketEvent.PARTICIPANT_REMOVED,
        handleParticipantRemoved,
      );
      socket.off(MeetingSocketEvent.MEETING_ENDED, handleMeetingEnded);
    };
  }, [
    accessToken,
    joinToken,
    meetingId,
    onMeetingEnded,
    onParticipantRemoved,
    queryClient,
  ]);
}
