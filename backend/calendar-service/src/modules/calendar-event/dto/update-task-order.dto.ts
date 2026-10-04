import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';
import { CALENDAR_DEFAULTS } from '../../../common/constants/calendar.constants';

export class UpdateTaskOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CALENDAR_DEFAULTS.MAX_PAGE_SIZE)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  eventIds: string[];
}
