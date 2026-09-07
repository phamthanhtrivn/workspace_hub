import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/trim.decorator';

export class UpdateLabelDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
