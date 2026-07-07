import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { MAX_FILE_SIZE } from 'src/common/utils/file.util';

@Controller('api/medias')
export class MediaController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('presign')
  async generatePresignedUrls(@Body() body: PresignRequestDto) {
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      throw new BadRequestException(
        'Files array is required and cannot be empty',
      );
    }

    const results: any[] = [];

    for (const file of body.files) {
      if (file.sizeBytes > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File ${file.fileName} exceeds the 100MB limit.`,
        );
      }

      const { presignedUrl, s3Key } =
        await this.s3Service.generatePresignedUploadUrl(
          body.conversationId,
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
      message: 'Generated presigned URLs successfully',
      data: results,
    };
  }
}
