import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên thư mục không được trống' })
  name: string;

  @IsUUID(4, { message: 'ID thư mục cha không hợp lệ' })
  @IsOptional()
  parentFolderId?: string;

  @IsUUID(4, { message: 'ID dự án không hợp lệ' })
  @IsOptional()
  projectId?: string;
}
