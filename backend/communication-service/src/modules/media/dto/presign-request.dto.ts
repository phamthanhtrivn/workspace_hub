import {
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CHAT_CONTEXT_TYPE } from '../../../common/types/chat.enums';
import { UPLOAD_POLICY } from '../../../infrastructure/s3/attachment-upload.policy';

class FileDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(0)
  @Max(UPLOAD_POLICY.MAX_SIZE_BYTES)
  sizeBytes: number;
}

export class PresignRequestDto {
  @IsOptional()
  @IsUUID('4')
  chatId?: string;

  @IsOptional()
  @IsEnum(CHAT_CONTEXT_TYPE)
  chatType?: CHAT_CONTEXT_TYPE;

  @IsOptional()
  @IsUUID('4')
  channelId?: string;

  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files: FileDto[];
}
