"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";

const disconnected = () => false;

export function useRecordingEvents(
  onChange: () => void,
  meetingId?: string,
  enabled = true,
) {
  const token = useAppSelector((state) => state.auth.accessToken);
  const userId = useAppSelector((state) => state.auth.userId);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!token || !enabled) return () => {};
      const socket = socketService.connect(token) as unknown as Socket;
      socket.on("connect", notify);
      socket.on("disconnect", notify);
      socket.on("connect_error", notify);
      return () => {
        socket.off("connect", notify);
        socket.off("disconnect", notify);
        socket.off("connect_error", notify);
      };
    },
    [token, enabled],
  );
  const snapshot = useCallback(
    () => Boolean(enabled && token && socketService.getSocket()?.connected),
    [enabled, token],
  );
  const connected = useSyncExternalStore(subscribe, snapshot, disconnected);
  useEffect(() => {
    if (!token || !enabled) return;
    const socket = socketService.connect(token) as unknown as Socket;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (!timer)
        timer = setTimeout(() => {
          timer = undefined;
          onChange();
        }, 100);
    };
    const handleRoom = (payload: { meetingId: string }) => {
      if (payload.meetingId === meetingId) refresh();
    };
    const handlePermission = (payload: {
      meetingId: string;
      userId?: string;
    }) => {
      if (payload.meetingId === meetingId && payload.userId === userId)
        refresh();
    };
    const roomEvents = [
      "meeting:recording_updated",
      "meeting:host_transferred",
    ];
    const userEvents = [
      "meeting:recording_ready",
      "meeting:recording_failed",
      "meeting:recording_deleted",
      "meeting:recording_access_updated",
    ];
    roomEvents.forEach((event) => socket.on(event, handleRoom));
    userEvents.forEach((event) => socket.on(event, refresh));
    socket.on("meeting:recording_permission_updated", handlePermission);
    socket.on("meeting:participant_updated", handlePermission);
    socket.on("connect", refresh);
    return () => {
      roomEvents.forEach((event) => socket.off(event, handleRoom));
      userEvents.forEach((event) => socket.off(event, refresh));
      socket.off("meeting:recording_permission_updated", handlePermission);
      socket.off("meeting:participant_updated", handlePermission);
      socket.off("connect", refresh);
      if (timer) clearTimeout(timer);
    };
  }, [token, meetingId, onChange, userId, enabled]);
  return connected;
}
