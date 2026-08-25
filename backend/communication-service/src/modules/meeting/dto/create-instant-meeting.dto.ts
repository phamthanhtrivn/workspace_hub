import { IsBoolean, IsOptional } from 'class-validator';

export class CreateInstantMeetingDto {
  @IsOptional()
  @IsBoolean()
  allowJoinWithoutApproval?: boolean;
}
