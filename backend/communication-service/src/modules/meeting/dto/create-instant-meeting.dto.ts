import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInstantMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsBoolean()
  allowJoinWithoutApproval?: boolean;
}
