import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateMeetingMessageMediaDto {
  @IsString()
  name: string;

  @IsString()
  s3Key: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  sizeBytes: number;
}

export class CreateMeetingMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMeetingMessageMediaDto)
  medias?: CreateMeetingMessageMediaDto[];
}
