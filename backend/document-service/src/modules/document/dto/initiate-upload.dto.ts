import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class InitiateUploadDto {
  @IsString()
  @IsNotEmpty({ message: 'File name cannot be empty' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Mime type cannot be empty' })
  mimeType: string;

  @IsNumber()
  @IsNotEmpty({ message: 'File size cannot be empty' })
  sizeBytes: number;

  @IsUUID(4, { message: 'Invalid parent folder ID' })
  @IsOptional()
  parentFolderId?: string;

  @IsUUID(4, { message: 'Invalid project ID' })
  @IsOptional()
  projectId?: string;
}
