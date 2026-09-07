import { MeetingRole } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateMeetingParticipantRoleDto {
  @IsIn([MeetingRole.HOST, MeetingRole.COHOST, MeetingRole.PARTICIPANT])
  role: MeetingRole;
}
