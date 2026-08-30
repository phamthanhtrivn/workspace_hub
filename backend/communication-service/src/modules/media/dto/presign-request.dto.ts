import {
  IsArray,
  IsString,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CHAT_CONTEXT_TYPE } from '../../chat/chat.enums';

class FileDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  sizeBytes: number;
}

export class PresignRequestDto {
  @IsOptional()
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsEnum(CHAT_CONTEXT_TYPE)
  chatType?: CHAT_CONTEXT_TYPE;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files: FileDto[];
}
