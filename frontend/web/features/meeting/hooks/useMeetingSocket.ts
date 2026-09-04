"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import {
  type ClientToServerMeetingEvents,
  MeetingSocketEvent,
  type MeetingJoinRequestUpdatedPayload,
  type MeetingStatusUpdatedPayload,
  type ServerToClientMeetingEvents,
} from "../types/meeting-socket.types";

interface MeetingSocketOptions {
  meetingId?: string | null;
  onStatusUpdated?: (payload: MeetingStatusUpdatedPayload) => void;
  onJoinRequested?: (payload: MeetingJoinRequestUpdatedPayload) => void;
  onJoinRequestChanged?: (payload: MeetingJoinRequestUpdatedPayload) => void;
}

type MeetingSocket = Socket<
  ServerToClientMeetingEvents,
  ClientToServerMeetingEvents
>;

export function useMeetingSocket({
  meetingId,
  onStatusUpdated,
  onJoinRequested,
  onJoinRequestChanged,
}: MeetingSocketOptions) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = socketService.connect(accessToken) as unknown as MeetingSocket;
    if (meetingId) {
      socket.emit(MeetingSocketEvent.JOIN, { meetingId });
    }

    const handleStatusUpdated = (payload: MeetingStatusUpdatedPayload) => {
      onStatusUpdated?.(payload);
    };
    const handleJoinRequestChanged = (
      payload: MeetingJoinRequestUpdatedPayload,
    ) => {
      onJoinRequestChanged?.(payload);
    };
    const handleJoinRequested = (payload: MeetingJoinRequestUpdatedPayload) => {
      onJoinRequested?.(payload);
      onJoinRequestChanged?.(payload);
    };

    socket.on(MeetingSocketEvent.STATUS_UPDATED, handleStatusUpdated);
    socket.on(MeetingSocketEvent.JOIN_REQUESTED, handleJoinRequested);
    socket.on(
      MeetingSocketEvent.JOIN_REQUEST_UPDATED,
      handleJoinRequestChanged,
    );

    return () => {
      socket.off(MeetingSocketEvent.STATUS_UPDATED, handleStatusUpdated);
      socket.off(MeetingSocketEvent.JOIN_REQUESTED, handleJoinRequested);
      socket.off(
        MeetingSocketEvent.JOIN_REQUEST_UPDATED,
        handleJoinRequestChanged,
      );
    };
  }, [
    accessToken,
    meetingId,
    onJoinRequestChanged,
    onJoinRequested,
    onStatusUpdated,
  ]);
}
