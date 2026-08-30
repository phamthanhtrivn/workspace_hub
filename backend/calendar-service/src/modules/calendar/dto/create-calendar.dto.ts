import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateCalendarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
