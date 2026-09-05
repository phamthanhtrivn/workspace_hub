import { OptionalField } from '../../../common/optional-field.decorator';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/trim.decorator';

export class UpdateSprintDto {
  @OptionalField()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @OptionalField()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @OptionalField()
  @IsDateString()
  endDate?: string;
}
