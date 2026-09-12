import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestMeetingJoinApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}
