import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMeetingSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoAdmit?: boolean;

  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;
}
