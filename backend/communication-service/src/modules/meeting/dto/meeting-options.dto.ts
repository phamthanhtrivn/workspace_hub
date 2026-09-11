import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class MeetingOptionsDto {
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
