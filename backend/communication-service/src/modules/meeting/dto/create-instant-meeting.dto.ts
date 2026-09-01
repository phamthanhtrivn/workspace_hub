import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class MeetingDeviceSettingsDto {
  @IsBoolean()
  cameraEnabled: boolean;

  @IsBoolean()
  microphoneEnabled: boolean;

  @IsOptional()
  @IsString()
  cameraDeviceId?: string;

  @IsOptional()
  @IsString()
  microphoneDeviceId?: string;
}

export class CreateInstantMeetingDto {
  @IsBoolean()
  @IsOptional()
  autoAdmit?: boolean;

  @ValidateNested()
  @Type(() => MeetingDeviceSettingsDto)
  @IsOptional()
  deviceSettings?: MeetingDeviceSettingsDto;
}
