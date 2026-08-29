import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ChatGateway } from '../../chat/chat.gateway';
import { MeetingParticipantPayload } from '../types/meeting.types';

interface MeetingRealtimeGatewayPort {
  emitMeetingAccessUpdated(
    meetingId: string,
    allowJoinWithoutApproval: boolean,
  ): void;
  emitMeetingEnded(meetingId: string, endedBy: string): void;
  emitMeetingJoinApproved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ): void;
  emitMeetingJoinRejected(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ): void;
  emitMeetingJoinRequested(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ): void;
  emitMeetingParticipantLeft(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ): void;
  emitMeetingParticipantRemoved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ): void;
  emitMeetingParticipantRoleUpdated(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ): void;
}

@Injectable()
export class MeetingRealtimePublisher {
  constructor(
    @Inject(forwardRef(() => ChatGateway))
    private readonly gateway: MeetingRealtimeGatewayPort,
  ) {}

  joinRequested(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.gateway.emitMeetingJoinRequested(meetingId, userId, participant);
  }

  joinApproved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.gateway.emitMeetingJoinApproved(meetingId, userId, participant);
  }

  joinRejected(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.gateway.emitMeetingJoinRejected(meetingId, userId, participant);
  }

  accessUpdated(meetingId: string, allowJoinWithoutApproval: boolean) {
    this.gateway.emitMeetingAccessUpdated(
      meetingId,
      allowJoinWithoutApproval,
    );
  }

  participantLeft(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.gateway.emitMeetingParticipantLeft(meetingId, userId, participant);
  }

  participantRemoved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.gateway.emitMeetingParticipantRemoved(
      meetingId,
      userId,
      participant,
    );
  }

  participantRoleUpdated(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.gateway.emitMeetingParticipantRoleUpdated(
      meetingId,
      userId,
      participant,
    );
  }

  meetingEnded(meetingId: string, endedBy: string) {
    this.gateway.emitMeetingEnded(meetingId, endedBy);
  }
}
