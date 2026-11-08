import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { DocumentBulkAction } from '../types/document-bulk.constants';

export class DocumentBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids: string[];

  @IsEnum(DocumentBulkAction)
  action: DocumentBulkAction;

  @IsOptional()
  @IsUUID()
  parentFolderId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
