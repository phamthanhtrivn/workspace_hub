import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class GetDailyStatsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;
}
