import { IsBoolean, IsOptional } from 'class-validator';

export class StartMeetingScreenShareDto {
  @IsOptional()
  @IsBoolean()
  interrupt?: boolean;
}
