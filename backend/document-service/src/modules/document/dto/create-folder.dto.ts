import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'Folder name cannot be empty' })
  name: string;

  @IsUUID(4, { message: 'Invalid parent folder ID' })
  @IsOptional()
  parentFolderId?: string;

  @IsUUID(4, { message: 'Invalid project ID' })
  @IsOptional()
  projectId?: string;
}
