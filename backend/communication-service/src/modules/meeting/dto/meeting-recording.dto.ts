import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { MeetingRecordingStatus } from '@prisma/client';

export class StartMeetingRecordingDto {
  @IsOptional()
  @IsIn(['speaker', 'grid', 'screen'])
  layout?: 'speaker' | 'grid' | 'screen';

  @IsOptional()
  @IsString()
  @Matches(/^TR_[A-Za-z0-9]+$/)
  @MaxLength(80)
  captureTrackSid?: string;
}

export class RecordingSettingsDto extends StartMeetingRecordingDto {
  @IsOptional()
  @IsBoolean()
  autoRecord?: boolean;
}

export class RecordingPermissionDto {
  @IsBoolean()
  canRecord: boolean;
}

export class RecordingRequestDecisionDto {
  @IsBoolean()
  approve: boolean;
}

export class ShareRecordingDto {
  @IsBoolean()
  canView: boolean;

  @IsBoolean()
  canDownload: boolean;
}

export class ShareRecordingParticipantsDto {
  @IsOptional()
  @IsBoolean()
  canDownload?: boolean;
}

export class RenameRecordingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;
}

export class ListRecordingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @IsOptional()
  @IsIn(['owned', 'shared', 'all'])
  scope?: 'owned' | 'shared' | 'all';

  @IsOptional()
  @IsEnum(MeetingRecordingStatus)
  status?: MeetingRecordingStatus;
}
