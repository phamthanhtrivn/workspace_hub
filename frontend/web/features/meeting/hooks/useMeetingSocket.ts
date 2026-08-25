"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import { MeetingSocketEvent } from "../api/meeting-socket.events";
import { meetingKeys } from "../types/meeting.constants";
import { MeetingSocketPayload } from "../types/meeting.types";

export function useMeetingSocket(meetingId?: string, joinToken?: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!accessToken || !meetingId) return;

    const socket = socketService.connect(accessToken) as any;
    const invalidateMeetingData = () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requests(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    };

    const handleMeetingEvent = (_payload: MeetingSocketPayload) => {
      invalidateMeetingData();
    };

    socket.emit(MeetingSocketEvent.JOIN_CONTROL_ROOM, { meetingId });
    socket.on(MeetingSocketEvent.JOIN_REQUESTED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.JOIN_APPROVED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.JOIN_REJECTED, handleMeetingEvent);
    socket.on(MeetingSocketEvent.ACCESS_UPDATED, handleMeetingEvent);

    return () => {
      socket.off(MeetingSocketEvent.JOIN_REQUESTED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.JOIN_APPROVED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.JOIN_REJECTED, handleMeetingEvent);
      socket.off(MeetingSocketEvent.ACCESS_UPDATED, handleMeetingEvent);
    };
  }, [accessToken, joinToken, meetingId, queryClient]);
}
