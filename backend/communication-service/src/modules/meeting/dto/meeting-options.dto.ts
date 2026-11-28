import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { MeetingRecordingOptionsDto } from './meeting-recording-options.dto';

export class MeetingOptionsDto extends MeetingRecordingOptionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @IsBoolean()
  @IsOptional()
  autoAdmit?: boolean;

  @IsBoolean()
  @IsOptional()
  chatEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  screenShareEnabled?: boolean;
}
