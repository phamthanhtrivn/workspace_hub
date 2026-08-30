import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CALENDAR_DEFAULTS } from '../../../common/constants/calendar.constants';

export class GetCalendarEventsQueryDto {
  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CALENDAR_DEFAULTS.MAX_PAGE_SIZE)
  limit: number = CALENDAR_DEFAULTS.DEFAULT_PAGE_SIZE;
}
