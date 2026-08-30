import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/trim.decorator';

export class UpdateSprintDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
