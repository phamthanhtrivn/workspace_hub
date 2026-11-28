import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { HISTORY_BULK_SELECTION_LIMIT } from '../types/meeting.constants';
import { MeetingHistoryBulkScope } from '../types/meeting.enums';

export class BulkUpdateMeetingHistoryVisibilityDto {
  @IsBoolean()
  hidden!: boolean;

  @IsEnum(MeetingHistoryBulkScope)
  scope!: MeetingHistoryBulkScope;

  @ValidateIf(
    (dto: BulkUpdateMeetingHistoryVisibilityDto) =>
      dto.scope === MeetingHistoryBulkScope.SELECTED ||
      dto.meetingIds !== undefined,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(HISTORY_BULK_SELECTION_LIMIT)
  @IsUUID('all', { each: true })
  meetingIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedCount?: number;
}

export class UndoMeetingHistoryBatchDto {
  @IsUUID()
  batchId!: string;
}
