import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateChannelSettingDto {
  @IsOptional()
  @IsBoolean()
  allowSendMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCreatePoll?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCreateNote?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPinMessage?: boolean;
}
