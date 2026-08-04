import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';

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
    userId: string,
    fileName: string,
    mimeType: string,
    folder = DOCUMENT_CONSTANTS.S3_FOLDER,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    try {
      const extension = path.extname(fileName);
      const cleanFileName = fileName.replace(/\s+/g, '_');
      const uniqueFileName = `${uuidv4()}_${cleanFileName}`;
      const s3Key = `${folder}/${userId}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: mimeType,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 600, // 10 minutes
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

  private getAsciiFilename(filename: string): string {
    return filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics / accents
      .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with '_'
      .replace(/"/g, '\\"'); // Escape double quotes
  }

  async generatePresignedDownloadUrl(s3Key: string, filename?: string): Promise<string> {
    try {
      let contentDisposition: string | undefined;

      if (filename) {
        const asciiFilename = this.getAsciiFilename(filename);
        const encodedFilename = encodeURIComponent(filename).replace(/'/g, '%27');
        contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ...(contentDisposition && {
          ResponseContentDisposition: contentDisposition,
        }),
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }
}
