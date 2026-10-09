"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";

export function useRecordingEvents(onChange: () => void, meetingId?: string) {
  const token = useAppSelector((state) => state.auth.accessToken);
  useEffect(() => {
    if (!token) return;
    const socket = socketService.connect(token) as unknown as Socket;
    const handleRoom = (payload: { meetingId: string }) => {
      if (payload.meetingId === meetingId) onChange();
    };
    const roomEvents = [
      "meeting:recording_updated",
      "meeting:recording_permission_updated",
      "meeting:participant_updated",
      "meeting:host_transferred",
    ];
    const userEvents = [
      "meeting:recording_ready",
      "meeting:recording_failed",
      "meeting:recording_deleted",
      "meeting:recording_access_updated",
    ];
    roomEvents.forEach((event) => socket.on(event, handleRoom));
    userEvents.forEach((event) => socket.on(event, onChange));
    socket.on("connect", onChange);
    return () => {
      roomEvents.forEach((event) => socket.off(event, handleRoom));
      userEvents.forEach((event) => socket.off(event, onChange));
      socket.off("connect", onChange);
    };
  }, [token, meetingId, onChange]);
}
