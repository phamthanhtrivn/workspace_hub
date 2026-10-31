import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { UPLOAD_POLICY } from '../../../infrastructure/s3/upload-policy';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty({ message: 'S3 key cannot be empty' })
  s3Key: string;

  @IsInt()
  @Min(0)
  @Max(UPLOAD_POLICY.MAX_SIZE_BYTES)
  @IsNotEmpty({ message: 'File size cannot be empty' })
  sizeBytes: number;

  @IsString()
  @IsNotEmpty({ message: 'Mime type cannot be empty' })
  mimeType: string;
}
