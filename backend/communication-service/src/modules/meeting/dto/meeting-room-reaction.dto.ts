import { IsIn } from 'class-validator';
import { MEETING_ROOM_REACTIONS } from '../types/meeting.constants';
import type { MeetingRoomReactionEmoji } from '../types/meeting.constants';

export class MeetingRoomReactionDto {
  @IsIn(MEETING_ROOM_REACTIONS)
  emoji!: MeetingRoomReactionEmoji;
}
