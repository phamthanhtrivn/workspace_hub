import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateS3Key } from '../../common/utils/s3-key.util';
import { S3_UPLOAD_TYPE } from 'src/common/types/file.enums';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_KEY!,
      },
    });
  }

  async generatePresignedUploadUrl(
    type: S3_UPLOAD_TYPE,
    referenceId: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    try {
      const s3Key = generateS3Key(type, referenceId, fileName);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: mimeType,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 600,
      });

      return { presignedUrl, s3Key };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Error deleting file from S3 (${s3Key}):`, error);
      throw new InternalServerErrorException('Failed to delete file from S3');
    }
  }
}
