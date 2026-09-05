"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { useAppSelector } from "@/store/store";
import {
  type ClientToServerMeetingEvents,
  type MeetingEndedPayload,
  type MeetingHostTransferredPayload,
  type MeetingChatNotificationPreferenceUpdatedPayload,
  type MeetingParticipantJoinedPayload,
  type MeetingParticipantLeftPayload,
  type MeetingMessageReadPayload,
  MeetingSocketEvent,
  type MeetingJoinRequestUpdatedPayload,
  type MeetingParticipantRemovedPayload,
  type MeetingParticipantUpdatedPayload,
  type MeetingStatusUpdatedPayload,
  type ServerToClientMeetingEvents,
} from "../types/meeting-socket.types";
import type { MeetingMessageResponse } from "../types/meeting.types";

interface MeetingSocketOptions {
  meetingId?: string | null;
  onStatusUpdated?: (payload: MeetingStatusUpdatedPayload) => void;
  onMeetingEnded?: (payload: MeetingEndedPayload) => void;
  onParticipantJoined?: (payload: MeetingParticipantJoinedPayload) => void;
  onParticipantLeft?: (payload: MeetingParticipantLeftPayload) => void;
  onParticipantUpdated?: (payload: MeetingParticipantUpdatedPayload) => void;
  onParticipantRemoved?: (payload: MeetingParticipantRemovedPayload) => void;
  onHostTransferred?: (payload: MeetingHostTransferredPayload) => void;
  onJoinRequested?: (payload: MeetingJoinRequestUpdatedPayload) => void;
  onJoinRequestChanged?: (payload: MeetingJoinRequestUpdatedPayload) => void;
  onMessageSent?: (message: MeetingMessageResponse) => void;
  onMessageRead?: (payload: MeetingMessageReadPayload) => void;
  onChatNotificationPreferenceUpdated?: (
    payload: MeetingChatNotificationPreferenceUpdatedPayload,
  ) => void;
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
  onParticipantLeft,
  onParticipantUpdated,
  onParticipantRemoved,
  onHostTransferred,
  onJoinRequested,
  onJoinRequestChanged,
  onMessageSent,
  onMessageRead,
  onChatNotificationPreferenceUpdated,
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
    const handleParticipantLeft = (payload: MeetingParticipantLeftPayload) => {
      onParticipantLeft?.(payload);
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
    const handleMessageSent = (message: MeetingMessageResponse) => {
      onMessageSent?.(message);
    };
    const handleMessageRead = (payload: MeetingMessageReadPayload) => {
      onMessageRead?.(payload);
    };
    const handleChatNotificationPreferenceUpdated = (
      payload: MeetingChatNotificationPreferenceUpdatedPayload,
    ) => {
      onChatNotificationPreferenceUpdated?.(payload);
    };

    socket.on(MeetingSocketEvent.PARTICIPANT_JOINED, handleParticipantJoined);
    socket.on(MeetingSocketEvent.PARTICIPANT_LEFT, handleParticipantLeft);
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
    socket.on(MeetingSocketEvent.MESSAGE_SENT, handleMessageSent);
    socket.on(MeetingSocketEvent.MESSAGE_READ, handleMessageRead);
    socket.on(
      MeetingSocketEvent.CHAT_NOTIFICATION_PREFERENCE_UPDATED,
      handleChatNotificationPreferenceUpdated,
    );

    return () => {
      socket.off(
        MeetingSocketEvent.PARTICIPANT_JOINED,
        handleParticipantJoined,
      );
      socket.off(MeetingSocketEvent.PARTICIPANT_LEFT, handleParticipantLeft);
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
      socket.off(MeetingSocketEvent.MESSAGE_SENT, handleMessageSent);
      socket.off(MeetingSocketEvent.MESSAGE_READ, handleMessageRead);
      socket.off(
        MeetingSocketEvent.CHAT_NOTIFICATION_PREFERENCE_UPDATED,
        handleChatNotificationPreferenceUpdated,
      );
    };
  }, [
    accessToken,
    meetingId,
    onHostTransferred,
    onJoinRequestChanged,
    onJoinRequested,
    onMeetingEnded,
    onMessageRead,
    onMessageSent,
    onChatNotificationPreferenceUpdated,
    onParticipantJoined,
    onParticipantLeft,
    onParticipantRemoved,
    onParticipantUpdated,
    onStatusUpdated,
  ]);
}
