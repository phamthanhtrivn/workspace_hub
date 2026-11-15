import { IsOptional, IsUUID } from 'class-validator';
export class CopyDocumentDto {
  @IsUUID() operationId!: string;
  @IsUUID() documentId!: string;
  @IsOptional() @IsUUID() versionId?: string;
}
