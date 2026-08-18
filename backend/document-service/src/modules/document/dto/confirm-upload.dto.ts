import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty({ message: 'File name cannot be empty' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Mime type cannot be empty' })
  mimeType: string;

  @IsNumber()
  @IsNotEmpty({ message: 'File size cannot be empty' })
  sizeBytes: number;

  @IsString()
  @IsNotEmpty({ message: 'S3 key cannot be empty' })
  s3Key: string;

  @IsUUID(4, { message: 'Invalid parent folder ID' })
  @IsOptional()
  parentFolderId?: string;

  @IsUUID(4, { message: 'Invalid project ID' })
  @IsOptional()
  projectId?: string;
}
