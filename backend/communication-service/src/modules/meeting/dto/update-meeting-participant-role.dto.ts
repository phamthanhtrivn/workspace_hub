import { IsEnum } from 'class-validator';
import { MeetingParticipantRoleValue } from '../types/meeting.enums';

export class UpdateMeetingParticipantRoleDto {
  @IsEnum(MeetingParticipantRoleValue)
  role: MeetingParticipantRoleValue;
}
