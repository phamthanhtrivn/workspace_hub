import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class TaskAttachmentDocumentsDto {
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsUUID(4, { message: 'Invalid user ID' })
  userId!: string;

  @IsEmail()
  userEmail!: string;

  @IsUUID(4, { message: 'Invalid project ID' })
  projectId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID(4, { each: true, message: 'Invalid document ID' })
  documentItemIds!: string[];
}
