import { IsBoolean } from 'class-validator';

export class UpdateMeetingAccessDto {
  @IsBoolean()
  allowJoinWithoutApproval: boolean;
}
