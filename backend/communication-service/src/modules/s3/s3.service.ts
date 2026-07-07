import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY!,
        secretAccessKey:
          process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_KEY!,
      },
    });
  }

  async generatePresignedUploadUrl(
    conversationId: string,
    fileName: string,
    mimeType: string,
    folder = 'chat-media',
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    try {
      const extension = path.extname(fileName);
      const uniqueFileName = `${uuidv4()}${extension}`;
      const s3Key = `${folder}/${conversationId}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: mimeType,
      });

      let presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 600,
      });

      return { presignedUrl, s3Key };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }
}
