"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import {
  MeetingSocketEvent,
  type ClientToServerMeetingEvents,
  type MeetingMessageReadPayload,
  type ServerToClientMeetingEvents,
} from "../types/meeting-socket.types";
import type { MeetingMessageResponse } from "../types/meeting.types";

type MeetingSocket = Socket<
  ServerToClientMeetingEvents,
  ClientToServerMeetingEvents
>;

export function useMeetingMessageSocket({
  meetingId,
  onMessage,
  onRead,
}: {
  meetingId: string;
  onMessage: (message: MeetingMessageResponse) => void;
  onRead: (payload: MeetingMessageReadPayload) => void;
}) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken || !meetingId) return;

    const socket = socketService.connect(accessToken) as unknown as MeetingSocket;
    socket.emit(MeetingSocketEvent.JOIN, { meetingId });

    const handleMessage = (message: MeetingMessageResponse) => {
      if (message.meetingId !== meetingId) return;
      onMessage(message);
    };

    const handleRead = (payload: MeetingMessageReadPayload) => {
      if (payload.meetingId !== meetingId) return;
      onRead(payload);
    };

    socket.on(MeetingSocketEvent.MESSAGE_SENT, handleMessage);
    socket.on(MeetingSocketEvent.MESSAGE_UPDATED, handleMessage);
    socket.on(MeetingSocketEvent.MESSAGE_READ, handleRead);

    return () => {
      socket.off(MeetingSocketEvent.MESSAGE_SENT, handleMessage);
      socket.off(MeetingSocketEvent.MESSAGE_UPDATED, handleMessage);
      socket.off(MeetingSocketEvent.MESSAGE_READ, handleRead);
    };
  }, [accessToken, meetingId, onMessage, onRead]);
}
