import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { UPLOAD_POLICY } from '../../../infrastructure/s3/upload-policy';

export class InitiateUploadDto {
  @IsString()
  @IsNotEmpty({ message: 'File name cannot be empty' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Mime type cannot be empty' })
  mimeType: string;

  @IsInt()
  @Min(0)
  @Max(UPLOAD_POLICY.MAX_SIZE_BYTES)
  @IsNotEmpty({ message: 'File size cannot be empty' })
  sizeBytes: number;

  @IsUUID(4, { message: 'Invalid parent folder ID' })
  @IsOptional()
  parentFolderId?: string;

  @IsUUID(4, { message: 'Invalid project ID' })
  @IsOptional()
  projectId?: string;

  @IsUUID(4, { message: 'Invalid overwrite item ID' })
  @IsOptional()
  overwriteItemId?: string;
}
