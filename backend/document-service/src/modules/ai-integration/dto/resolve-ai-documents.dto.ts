import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AiDocumentReferenceDto {
  @IsUUID()
  documentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  versionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  expectedRevision?: string;
}

export class ResolveAiDocumentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AiDocumentReferenceDto)
  documents: AiDocumentReferenceDto[];
}
