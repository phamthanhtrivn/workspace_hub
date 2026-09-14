import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CALENDAR_DEFAULTS } from '../../../common/constants/calendar.constants';

export class GetCalendarTasksQueryDto {
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

