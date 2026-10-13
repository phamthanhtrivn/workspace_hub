import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  RecordingMultipartUploader,
  RecordingUploadOptions,
} from './recording-multipart-upload';
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
      maxAttempts: 4,
      requestHandler: { connectionTimeout: 5000, requestTimeout: 60_000 },
      region: process.env.AWS_REGION!,
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_KEY!,
      },
    });
  }

  async getFileSize(s3Key: string): Promise<bigint> {
    const result = await this.s3Client.send(
      new HeadObjectCommand({ Bucket: this.bucketName, Key: s3Key }),
    );
    return BigInt(result.ContentLength ?? 0);
  }

  async generateRecordingUrl(s3Key: string, download = false) {
    const expiresIn = 300;
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ResponseContentDisposition: download
        ? 'attachment; filename="meeting-recording.mp4"'
        : 'inline',
      ResponseContentType: 'video/mp4',
    });
    return {
      url: await getSignedUrl(this.s3Client, command, { expiresIn }),
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  uploadRecordingBackup(
    path: string,
    s3Key: string,
    options?: RecordingUploadOptions,
  ) {
    return new RecordingMultipartUploader(
      this.s3Client,
      this.bucketName,
    ).upload(path, s3Key, options);
  }

  abortRecordingUpload(s3Key: string, uploadId: string) {
    return new RecordingMultipartUploader(this.s3Client, this.bucketName).abort(
      s3Key,
      uploadId,
    );
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
