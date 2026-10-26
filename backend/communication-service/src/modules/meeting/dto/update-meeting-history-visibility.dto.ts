import { IsBoolean } from 'class-validator';

export class UpdateMeetingHistoryVisibilityDto {
  @IsBoolean()
  hidden!: boolean;
}
