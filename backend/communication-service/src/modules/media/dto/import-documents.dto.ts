import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CHAT_CONTEXT_TYPE } from '../../../common/types/chat.enums';
class DocumentImportRefDto {
  @IsUUID() documentId!: string;
  @IsOptional() @IsUUID() versionId?: string;
}
export class ImportDocumentsDto {
  @IsUUID() operationId!: string;
  @IsUUID() chatId!: string;
  @IsEnum(CHAT_CONTEXT_TYPE) chatType!: CHAT_CONTEXT_TYPE;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DocumentImportRefDto)
  refs!: DocumentImportRefDto[];
}
