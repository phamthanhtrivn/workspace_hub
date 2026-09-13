import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import {
  MEETING_ROOM_REACTIONS,
  type MeetingRoomReactionEmoji,
} from '../types/meeting.constants';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type { SendMeetingRoomReactionParams } from '../types/meeting.types';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

@Injectable()
export class MeetingRoomReactionService {
  constructor(
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
  ) {}

  async sendReaction({
    joinToken,
    userId,
    dto,
  }: SendMeetingRoomReactionParams) {
    if (!this.isSupportedReaction(dto.emoji)) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_REACTION_INVALID,
      );
    }

    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const payload = {
      id: randomUUID(),
      meetingId: meeting.id,
      userId,
      emoji: dto.emoji,
      createdAt: new Date().toISOString(),
    };

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.ROOM_REACTION,
      payload,
    );

    return payload;
  }

  private isSupportedReaction(
    emoji: string,
  ): emoji is MeetingRoomReactionEmoji {
    return (MEETING_ROOM_REACTIONS as readonly string[]).includes(emoji);
  }
}
