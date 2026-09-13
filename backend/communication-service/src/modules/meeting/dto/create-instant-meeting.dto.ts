import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
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

  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @ValidateNested()
  @Type(() => MeetingDeviceSettingsDto)
  @IsOptional()
  deviceSettings?: MeetingDeviceSettingsDto;
}
