import { IsBoolean } from 'class-validator';

export class UpdateMeetingSettingsDto {
  @IsBoolean()
  autoAdmit: boolean;
}
