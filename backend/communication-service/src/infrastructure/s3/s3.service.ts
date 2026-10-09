import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { open } from 'fs/promises';
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

  async uploadRecordingBackup(path: string, s3Key: string): Promise<bigint> {
    const file = await open(path, 'r');
    let uploadId: string | undefined;
    try {
      const stat = await file.stat();
      const partSize = 16 * 1024 * 1024;
      if (!stat.size || Math.ceil(stat.size / partSize) > 10000)
        throw new Error('Invalid backup size');
      const created = await this.s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          ContentType: 'video/mp4',
        }),
      );
      uploadId = created.UploadId;
      if (!uploadId) throw new Error('Upload ID missing');
      const parts: { PartNumber: number; ETag: string }[] = [];
      const buffer = Buffer.alloc(partSize);
      for (let position = 0; position < stat.size;) {
        const length = Math.min(partSize, stat.size - position);
        let offset = 0;
        while (offset < length) {
          const { bytesRead } = await file.read(
            buffer,
            offset,
            length - offset,
            position + offset,
          );
          if (!bytesRead) throw new Error('Backup was truncated');
          offset += bytesRead;
        }
        const part = await this.s3Client.send(
          new UploadPartCommand({
            Bucket: this.bucketName,
            Key: s3Key,
            UploadId: uploadId,
            PartNumber: parts.length + 1,
            Body: buffer.subarray(0, length),
          }),
        );
        if (!part.ETag) throw new Error('ETag missing');
        parts.push({ PartNumber: parts.length + 1, ETag: part.ETag });
        position += length;
      }
      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }),
      );
      return BigInt(stat.size);
    } catch (error) {
      if (uploadId)
        await this.s3Client
          .send(
            new AbortMultipartUploadCommand({
              Bucket: this.bucketName,
              Key: s3Key,
              UploadId: uploadId,
            }),
          )
          .catch(() => undefined);
      throw error;
    } finally {
      await file.close();
    }
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
