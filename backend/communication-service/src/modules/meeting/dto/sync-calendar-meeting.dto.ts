import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
export class SyncCalendarMeetingDto {
  @IsUUID() eventId!: string;
  @IsUUID() hostId!: string;
  @IsNumberString({ no_symbols: true }) revision!: string;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() @MaxLength(128) adoptJoinToken?: string;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsDateString() scheduledStartAt!: string;
  @IsDateString() scheduledEndAt!: string;
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  inviteeIds!: string[];
}
