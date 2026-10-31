import { BadRequestException, Injectable } from '@nestjs/common';
import { MAX_FILE_SIZE } from '../../common/utils/file.util';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { S3_UPLOAD_TYPE } from '../../common/types/file.enums';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { MediaAccessService } from './media-access.service';
import {
  MEDIA_SUCCESS_MESSAGES,
  MEDIA_ERROR_MESSAGES,
} from './types/media.enums';

@Injectable()
export class MediaService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly access: MediaAccessService,
  ) {}

  async generatePresignedUrls(body: PresignRequestDto, userId: string) {
    this.validatePresignRequest(body);
    const referenceId = this.getReferenceId(body);
    const chatType =
      body.chatType ??
      (body.channelId
        ? CHAT_CONTEXT_TYPE.CHANNEL
        : CHAT_CONTEXT_TYPE.DIRECT_MESSAGE);
    for (const file of body.files)
      this.validateFileSize(file.fileName, file.sizeBytes);
    await this.access.assertCanUpload(referenceId, chatType, userId);

    const results: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      s3Key: string;
      presignedUrl: string;
    }[] = [];

    for (const file of body.files) {
      const { presignedUrl, s3Key } =
        await this.s3Service.generatePresignedUploadUrl(
          S3_UPLOAD_TYPE.CHAT_MEDIA,
          referenceId,
          file.fileName,
          file.mimeType,
          { actorId: userId, referenceId, chatType, sizeBytes: file.sizeBytes },
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
    if (
      (body.chatId && !body.chatType) ||
      (body.channelId && body.conversationId) ||
      (body.chatId &&
        body.channelId &&
        (body.chatId !== body.channelId ||
          body.chatType !== CHAT_CONTEXT_TYPE.CHANNEL)) ||
      (body.chatId &&
        body.conversationId &&
        (body.chatId !== body.conversationId ||
          body.chatType !== CHAT_CONTEXT_TYPE.DIRECT_MESSAGE))
    ) {
      throw new BadRequestException(
        MEDIA_ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
      );
    }
    if (!this.getReferenceId(body)) {
      throw new BadRequestException(
        MEDIA_ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
      );
    }

    if (!body.files || body.files.length === 0) {
      throw new BadRequestException(MEDIA_ERROR_MESSAGES.EMPTY_FILES);
    }
  }

  private getReferenceId(body: PresignRequestDto): string {
    if (body.chatId && body.chatType) {
      return body.chatId;
    }

    if (body.channelId) {
      return body.channelId;
    }

    if (body.conversationId) {
      return body.conversationId;
    }

    return '';
  }

  private validateFileSize(fileName: string, sizeBytes: number): void {
    if (
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes < 0 ||
      sizeBytes > MAX_FILE_SIZE
    ) {
      throw new BadRequestException(
        MEDIA_ERROR_MESSAGES.FILE_TOO_LARGE.replace('{fileName}', fileName),
      );
    }
  }
}
