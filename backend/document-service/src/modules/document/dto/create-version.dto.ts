import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty({ message: 'S3 key cannot be empty' })
  s3Key: string;

  @IsNumber()
  @IsNotEmpty({ message: 'File size cannot be empty' })
  sizeBytes: number;

  @IsString()
  @IsNotEmpty({ message: 'Mime type cannot be empty' })
  mimeType: string;
}
