import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MeetingHistoryVisibility } from '../types/meeting.enums';

export class ListMeetingHistoryDto {
  @IsOptional()
  @IsEnum(MeetingHistoryVisibility)
  visibility?: MeetingHistoryVisibility;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
