import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EventStatus, EventVisibility } from '@prisma/client';
import { CALENDAR_DEFAULTS } from '../../../common/constants/calendar.constants';
import { CalendarEventAttendeeDto } from './calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './calendar-event-reminder.dto';

export class CreateCalendarEventDto {
  @IsUUID()
  calendarId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string;

  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  exceptionDates?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  documentIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CALENDAR_DEFAULTS.MAX_ATTENDEES)
  @ValidateNested({ each: true })
  @Type(() => CalendarEventAttendeeDto)
  attendees?: CalendarEventAttendeeDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CALENDAR_DEFAULTS.MAX_REMINDERS)
  @ValidateNested({ each: true })
  @Type(() => CalendarEventReminderDto)
  reminders?: CalendarEventReminderDto[];
}
