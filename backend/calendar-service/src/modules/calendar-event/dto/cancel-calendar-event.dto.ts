import { IsEnum, IsOptional } from 'class-validator';
import { RecurrenceScope } from '../../../common/enums/calendar.enum';

export class CancelCalendarEventDto {
  @IsOptional()
  @IsEnum(RecurrenceScope)
  scope: RecurrenceScope = RecurrenceScope.THIS;
}
