import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên tệp không được trống' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Mime type không được trống' })
  mimeType: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Dung lượng tệp không được trống' })
  sizeBytes: number;

  @IsString()
  @IsNotEmpty({ message: 'S3 key không được trống' })
  s3Key: string;

  @IsUUID(4, { message: 'ID thư mục cha không hợp lệ' })
  @IsOptional()
  parentFolderId?: string;

  @IsUUID(4, { message: 'ID dự án không hợp lệ' })
  @IsOptional()
  projectId?: string;
}
