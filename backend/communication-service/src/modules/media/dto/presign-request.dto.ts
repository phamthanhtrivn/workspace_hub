import {
  IsArray,
  IsString,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class FileDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  sizeBytes: number;
}

export class PresignRequestDto {
  @IsString()
  conversationId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files: FileDto[];
}
