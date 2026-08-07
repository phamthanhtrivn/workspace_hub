import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty({ message: 'S3 key không được trống' })
  s3Key: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Dung lượng tệp không được trống' })
  sizeBytes: number;

  @IsString()
  @IsNotEmpty({ message: 'Mime type không được trống' })
  mimeType: string;
}
