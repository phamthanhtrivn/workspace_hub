import { BadRequestException, Injectable } from '@nestjs/common';
import { MAX_FILE_SIZE } from 'src/common/utils/file.util';
import { S3Service } from 'src/infrastructure/s3/s3.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { S3_UPLOAD_TYPE } from 'src/common/types/file.enums';
import { MEDIA_SUCCESS_MESSAGES, MEDIA_ERROR_MESSAGES } from './types/media.enums';

@Injectable()
export class MediaService {
  constructor(private readonly s3Service: S3Service) {}

  async generatePresignedUrls(body: PresignRequestDto) {
    this.validatePresignRequest(body);

    const results: any[] = [];

    for (const file of body.files) {
      this.validateFileSize(file.fileName, file.sizeBytes);

      const { presignedUrl, s3Key } =
        await this.s3Service.generatePresignedUploadUrl(
          S3_UPLOAD_TYPE.CHAT_MEDIA,
          body.channelId,
          file.fileName,
          file.mimeType,
        );

      results.push({
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        s3Key,
        presignedUrl,
      });
    }

    return {
      message: MEDIA_SUCCESS_MESSAGES.PRESIGNED_URLS_GENERATED,
      data: results,
    };
  }

  private validatePresignRequest(body: PresignRequestDto): void {
    if (!body.files || body.files.length === 0) {
      throw new BadRequestException(
        MEDIA_ERROR_MESSAGES.EMPTY_FILES,
      );
    }
  }

  private validateFileSize(fileName: string, sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(
        MEDIA_ERROR_MESSAGES.FILE_TOO_LARGE.replace('{fileName}', fileName),
      );
    }
  }
}
