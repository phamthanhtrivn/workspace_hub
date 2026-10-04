import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetTodaySessionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;
}
