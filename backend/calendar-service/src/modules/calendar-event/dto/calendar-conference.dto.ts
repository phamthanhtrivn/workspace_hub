import { IsBoolean } from 'class-validator';
export class CalendarConferenceDto {
  @IsBoolean()
  enabled!: boolean;
}
