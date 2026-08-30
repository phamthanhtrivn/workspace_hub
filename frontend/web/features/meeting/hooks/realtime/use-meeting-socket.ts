"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import { MeetingSocketEvent } from "../../api/meeting-socket.events";
import { meetingKeys } from "../../types/meeting.constants";
import { MeetingSocketPayload } from "../../types/meeting.types";

const MEETING_REALTIME_EVENTS = [
  MeetingSocketEvent.JOIN_REQUESTED,
  MeetingSocketEvent.JOIN_APPROVED,
  MeetingSocketEvent.JOIN_REJECTED,
  MeetingSocketEvent.ACCESS_UPDATED,
  MeetingSocketEvent.PARTICIPANT_LEFT,
  MeetingSocketEvent.PARTICIPANT_ROLE_UPDATED,
  MeetingSocketEvent.PARTICIPANT_REMOVED,
  MeetingSocketEvent.MEETING_ENDED,
] as const;

type MeetingRoomControlEvent =
  | MeetingSocketEvent.JOIN_CONTROL_ROOM
  | MeetingSocketEvent.LEAVE_CONTROL_ROOM;
type MeetingRealtimeEvent = (typeof MEETING_REALTIME_EVENTS)[number];
type MeetingSocketHandler = (payload: MeetingSocketPayload) => void;

interface MeetingRealtimeSocket {
  emit: (
    event: MeetingRoomControlEvent,
    payload: { meetingId: string },
  ) => void;
  on: (event: MeetingRealtimeEvent, handler: MeetingSocketHandler) => void;
  off: (event: MeetingRealtimeEvent, handler: MeetingSocketHandler) => void;
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
        queryKey: meetingKeys.requestsRoot(meetingId),
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
    const getHandlerForEvent = (
      event: MeetingRealtimeEvent,
    ): MeetingSocketHandler => {
      if (event === MeetingSocketEvent.MEETING_ENDED) {
        return handleMeetingEnded;
      }
      if (event === MeetingSocketEvent.PARTICIPANT_REMOVED) {
        return handleParticipantRemoved;
      }
      return handleMeetingEvent;
    };

    socket.emit(MeetingSocketEvent.JOIN_CONTROL_ROOM, { meetingId });
    MEETING_REALTIME_EVENTS.forEach((event) => {
      socket.on(event, getHandlerForEvent(event));
    });

    return () => {
      socket.emit(MeetingSocketEvent.LEAVE_CONTROL_ROOM, { meetingId });
      MEETING_REALTIME_EVENTS.forEach((event) => {
        socket.off(event, getHandlerForEvent(event));
      });
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
