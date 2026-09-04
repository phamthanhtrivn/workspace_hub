"use client";

import { useEffect } from "react";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import {
  MeetingSocketEvent,
  type MeetingJoinRequestUpdatedPayload,
  type MeetingStatusUpdatedPayload,
} from "../types/meeting-socket.types";

interface MeetingSocketOptions {
  meetingId?: string | null;
  onStatusUpdated?: (payload: MeetingStatusUpdatedPayload) => void;
  onJoinRequestChanged?: (payload: MeetingJoinRequestUpdatedPayload) => void;
}

type MeetingSocket = {
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (payload: never) => void) => void;
  off: (event: string, handler: (payload: never) => void) => void;
};

export function useMeetingSocket({
  meetingId,
  onStatusUpdated,
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

    socket.on(
      MeetingSocketEvent.STATUS_UPDATED,
      handleStatusUpdated as (payload: never) => void,
    );
    socket.on(
      MeetingSocketEvent.JOIN_REQUESTED,
      handleJoinRequestChanged as (payload: never) => void,
    );
    socket.on(
      MeetingSocketEvent.JOIN_REQUEST_UPDATED,
      handleJoinRequestChanged as (payload: never) => void,
    );

    return () => {
      socket.off(
        MeetingSocketEvent.STATUS_UPDATED,
        handleStatusUpdated as (payload: never) => void,
      );
      socket.off(
        MeetingSocketEvent.JOIN_REQUESTED,
        handleJoinRequestChanged as (payload: never) => void,
      );
      socket.off(
        MeetingSocketEvent.JOIN_REQUEST_UPDATED,
        handleJoinRequestChanged as (payload: never) => void,
      );
    };
  }, [accessToken, meetingId, onJoinRequestChanged, onStatusUpdated]);
}
