import { DayOfWeek, ReminderMethod } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateCalendarSettingDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(DayOfWeek)
  firstDayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsBoolean()
  showWeekends?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60 * 24 * 30)
  defaultReminderMinutes?: number | null;

  @IsOptional()
  @IsEnum(ReminderMethod)
  defaultReminderMethod?: ReminderMethod | null;
}
