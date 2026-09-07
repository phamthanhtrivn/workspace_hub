import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMeetingParticipantViewPreferenceDto {
  @IsOptional()
  @IsBoolean()
  audioMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
