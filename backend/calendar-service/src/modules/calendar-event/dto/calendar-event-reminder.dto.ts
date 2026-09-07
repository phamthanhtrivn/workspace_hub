import { ReminderMethod } from '@prisma/client';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

export class CalendarEventReminderDto {
  @IsInt()
  @Min(0)
  @Max(60 * 24 * 30)
  minutesBefore: number;

  @IsEnum(ReminderMethod)
  method: ReminderMethod;
}
