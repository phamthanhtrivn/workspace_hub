import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConversationSettingDto {
  @IsOptional()
  @IsBoolean()
  allowMemberInvite?: boolean;

  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

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
