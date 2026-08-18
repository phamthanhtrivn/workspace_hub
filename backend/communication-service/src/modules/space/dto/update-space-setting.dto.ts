import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSpaceSettingDto {
  @IsBoolean()
  @IsOptional()
  allowMemberCreateChannel?: boolean;

  @IsBoolean()
  @IsOptional()
  allowMemberDeleteOwnChannel?: boolean;
}
