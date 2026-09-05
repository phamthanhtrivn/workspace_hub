"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import {
  type ClientToServerMeetingEvents,
  type MeetingEndedPayload,
  type MeetingHostTransferredPayload,
  type MeetingParticipantJoinedPayload,
  MeetingSocketEvent,
  type MeetingJoinRequestUpdatedPayload,
  type MeetingParticipantRemovedPayload,
  type MeetingParticipantUpdatedPayload,
  type MeetingStatusUpdatedPayload,
  type ServerToClientMeetingEvents,
} from "../types/meeting-socket.types";

interface MeetingSocketOptions {
  meetingId?: string | null;
  onStatusUpdated?: (payload: MeetingStatusUpdatedPayload) => void;
  onMeetingEnded?: (payload: MeetingEndedPayload) => void;
  onParticipantJoined?: (payload: MeetingParticipantJoinedPayload) => void;
  onParticipantUpdated?: (payload: MeetingParticipantUpdatedPayload) => void;
  onParticipantRemoved?: (payload: MeetingParticipantRemovedPayload) => void;
  onHostTransferred?: (payload: MeetingHostTransferredPayload) => void;
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
  onMeetingEnded,
  onParticipantJoined,
  onParticipantUpdated,
  onParticipantRemoved,
  onHostTransferred,
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
    const handleMeetingEnded = (payload: MeetingEndedPayload) => {
      onMeetingEnded?.(payload);
    };
    const handleParticipantJoined = (
      payload: MeetingParticipantJoinedPayload,
    ) => {
      onParticipantJoined?.(payload);
    };
    const handleParticipantUpdated = (
      payload: MeetingParticipantUpdatedPayload,
    ) => {
      onParticipantUpdated?.(payload);
    };
    const handleParticipantRemoved = (
      payload: MeetingParticipantRemovedPayload,
    ) => {
      onParticipantRemoved?.(payload);
    };
    const handleHostTransferred = (payload: MeetingHostTransferredPayload) => {
      onHostTransferred?.(payload);
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

    socket.on(MeetingSocketEvent.PARTICIPANT_JOINED, handleParticipantJoined);
    socket.on(MeetingSocketEvent.PARTICIPANT_UPDATED, handleParticipantUpdated);
    socket.on(MeetingSocketEvent.PARTICIPANT_REMOVED, handleParticipantRemoved);
    socket.on(MeetingSocketEvent.HOST_TRANSFERRED, handleHostTransferred);
    socket.on(MeetingSocketEvent.STATUS_UPDATED, handleStatusUpdated);
    socket.on(MeetingSocketEvent.ENDED, handleMeetingEnded);
    socket.on(MeetingSocketEvent.JOIN_REQUESTED, handleJoinRequested);
    socket.on(
      MeetingSocketEvent.JOIN_REQUEST_UPDATED,
      handleJoinRequestChanged,
    );

    return () => {
      socket.off(
        MeetingSocketEvent.PARTICIPANT_JOINED,
        handleParticipantJoined,
      );
      socket.off(
        MeetingSocketEvent.PARTICIPANT_UPDATED,
        handleParticipantUpdated,
      );
      socket.off(
        MeetingSocketEvent.PARTICIPANT_REMOVED,
        handleParticipantRemoved,
      );
      socket.off(MeetingSocketEvent.HOST_TRANSFERRED, handleHostTransferred);
      socket.off(MeetingSocketEvent.STATUS_UPDATED, handleStatusUpdated);
      socket.off(MeetingSocketEvent.ENDED, handleMeetingEnded);
      socket.off(MeetingSocketEvent.JOIN_REQUESTED, handleJoinRequested);
      socket.off(
        MeetingSocketEvent.JOIN_REQUEST_UPDATED,
        handleJoinRequestChanged,
      );
    };
  }, [
    accessToken,
    meetingId,
    onHostTransferred,
    onJoinRequestChanged,
    onJoinRequested,
    onMeetingEnded,
    onParticipantJoined,
    onParticipantRemoved,
    onParticipantUpdated,
    onStatusUpdated,
  ]);
}
