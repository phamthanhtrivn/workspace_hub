import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsUUID } from 'class-validator';
import { TaskDocumentAttachmentSource } from '../task-document.enums';

export class AttachTaskDocumentsDto {
  @IsOptional()
  @IsUUID()
  operationId?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID(4, { each: true, message: 'Invalid document ID' })
  documentItemIds!: string[];

  @IsIn(Object.values(TaskDocumentAttachmentSource))
  source!: TaskDocumentAttachmentSource;
}
