import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class MeetingRecordingOptionsDto {
  @IsOptional()
  @IsBoolean()
  autoRecord?: boolean;

  @IsOptional()
  @IsIn(['speaker', 'grid', 'screen'])
  recordingLayout?: 'speaker' | 'grid' | 'screen';
}
