import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CalendarEventAttendeeDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}
