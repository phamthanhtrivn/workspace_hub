import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { UploadIntentService } from './upload-intent.service';
import {
  UploadConfirmation,
  UploadScope,
  UPLOAD_POLICY,
  validateUploadContent,
  validateUploadMetadata,
} from './upload-policy';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  async describeAiSource(key: string, withDownload: boolean) {
    const object = await this.s3Client.send(
      new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (!object.ETag || object.ContentLength === undefined) {
      throw new InternalServerErrorException(
        'Document object metadata is incomplete',
      );
    }
    const downloadUrl = withDownload
      ? await getSignedUrl(
          this.s3Client,
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            VersionId: object.VersionId,
            IfMatch: object.ETag,
          }),
          { expiresIn: 120 },
        )
      : undefined;
    return {
      etag: object.ETag,
      sizeBytes: object.ContentLength,
      mimeType: object.ContentType ?? DOCUMENT_CONSTANTS.DEFAULT_MIME_TYPE,
      objectVersionId: object.VersionId,
      downloadUrl,
    };
  }

  constructor(private readonly uploadIntents: UploadIntentService) {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials:
        process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY,
              secretAccessKey: process.env.AWS_SECRET_KEY,
            }
          : undefined,
    });
  }

  async generatePresignedUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    scope: UploadScope,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    validateUploadMetadata(fileName, mimeType);
    try {
      const cleanFileName = fileName.replace(/\s+/g, '_');
      const uniqueFileName = `${uuidv4()}_${cleanFileName}`;
      const s3Key = `${DOCUMENT_CONSTANTS.S3_FOLDER}/${userId}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: mimeType,
        ContentLength: sizeBytes,
        IfNoneMatch: '*',
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: UPLOAD_POLICY.URL_LIFETIME_SECONDS,
      });

      await this.uploadIntents.create(s3Key, sizeBytes, mimeType, scope);

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

  async assertUploadSize(
    s3Key: string,
    expectedBytes: number,
    scope?: UploadConfirmation,
  ): Promise<void> {
    if (scope)
      await this.uploadIntents.assertScope(s3Key, expectedBytes, scope);
    const object = await this.s3Client.send(
      new HeadObjectCommand({ Bucket: this.bucketName, Key: s3Key }),
    );
    if (
      !Number.isSafeInteger(expectedBytes) ||
      expectedBytes < 0 ||
      (scope && expectedBytes > UPLOAD_POLICY.MAX_SIZE_BYTES) ||
      object.ContentLength !== expectedBytes
    ) {
      throw new BadRequestException(
        'Uploaded file size does not match its metadata',
      );
    }
    if (scope) {
      if (object.ContentType !== scope.mimeType) {
        throw new BadRequestException(
          'Uploaded content type does not match its metadata',
        );
      }
      if (expectedBytes > 0) {
        const content = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
            Range: `bytes=0-${UPLOAD_POLICY.SIGNATURE_BYTES - 1}`,
            IfMatch: object.ETag,
          }),
        );
        if (!content.Body)
          throw new BadRequestException('Uploaded content is missing');
        validateUploadContent(
          Buffer.from(await content.Body.transformToByteArray()),
          scope.mimeType,
        );
      } else {
        validateUploadContent(Buffer.alloc(0), scope.mimeType);
      }
      await this.uploadIntents.bind(s3Key, scope.target);
    }
  }

  async copyFile(
    sourceKey: string,
    ownerUserId: string,
    fileName: string,
  ): Promise<string> {
    const key = `${DOCUMENT_CONSTANTS.S3_FOLDER}/${ownerUserId}/${uuidv4()}_${fileName.replace(/\s+/g, '_')}`;
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        CopySource: `${this.bucketName}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`,
      }),
    );
    return key;
  }

  /**
   * Streams a file directly from S3 as a Node.js Readable.
   * Used for piping files into a ZIP archive without buffering to disk.
   */
  async getFileStream(s3Key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new InternalServerErrorException('Empty S3 response body');
      }
      return response.Body as Readable;
    } catch (error) {
      console.error(`Error streaming file from S3 (${s3Key}):`, error);
      throw new InternalServerErrorException('Failed to stream file from S3');
    }
  }

  private getAsciiFilename(filename: string): string {
    return filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics / accents
      .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with '_'
      .replace(/"/g, '\\"'); // Escape double quotes
  }

  async generatePresignedDownloadUrl(
    s3Key: string,
    filename?: string,
    expiresIn = 3600,
    inline = false,
  ): Promise<string> {
    try {
      let contentDisposition: string | undefined;

      if (filename) {
        const asciiFilename = this.getAsciiFilename(filename);
        const encodedFilename = encodeURIComponent(filename).replace(
          /'/g,
          '%27',
        );
        contentDisposition = `${inline ? 'inline' : 'attachment'}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ...(contentDisposition && {
          ResponseContentDisposition: contentDisposition,
        }),
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }
}
