import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
