import { Injectable } from '@nestjs/common';
import { ChatGateway } from '../../chat/chat.gateway';
import {
  MeetingParticipantPayload,
} from '../types/meeting.types';

@Injectable()
export class MeetingRealtimePublisher {
  constructor(private readonly chatGateway: ChatGateway) {}

  joinRequested(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.chatGateway.emitMeetingJoinRequested(meetingId, userId, participant);
  }

  joinApproved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.chatGateway.emitMeetingJoinApproved(meetingId, userId, participant);
  }

  joinRejected(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.chatGateway.emitMeetingJoinRejected(meetingId, userId, participant);
  }

  accessUpdated(meetingId: string, allowJoinWithoutApproval: boolean) {
    this.chatGateway.emitMeetingAccessUpdated(
      meetingId,
      allowJoinWithoutApproval,
    );
  }

  participantLeft(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.chatGateway.emitMeetingParticipantLeft(meetingId, userId, participant);
  }

  participantRemoved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    this.chatGateway.emitMeetingParticipantRemoved(
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
    this.chatGateway.emitMeetingParticipantRoleUpdated(
      meetingId,
      userId,
      participant,
    );
  }

  meetingEnded(meetingId: string, endedBy: string) {
    this.chatGateway.emitMeetingEnded(meetingId, endedBy);
  }
}
