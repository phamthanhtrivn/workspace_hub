import {
  Body,
  Controller,
  Post,
  Headers,
  Get,
  Query,
  Header,
} from '@nestjs/common';
import { PresignRequestDto } from './dto/presign-request.dto';
import { MediaService } from './media.service';
import { DocumentAttachmentImportService } from './document-attachment-import.service';
import { ImportDocumentsDto } from './dto/import-documents.dto';
import {
  MEDIA_API_PATH,
  MEDIA_ACCESS_ROUTE,
} from '../../common/types/media.constants';

@Controller(MEDIA_API_PATH)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly imports: DocumentAttachmentImportService,
  ) {}

  @Get('copy-targets/meetings')
  meetingCopyTargets(@Headers('x-user-id') userId: string) {
    return this.imports.meetingTargets(userId);
  }

  @Post('import-documents')
  importDocuments(
    @Body() body: ImportDocumentsDto,
    @Headers('x-user-id') userId: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.imports.import(userId, authorization, body);
  }

  @Get(MEDIA_ACCESS_ROUTE)
  @Header('Cache-Control', 'no-store')
  getAccessUrl(
    @Query('key') key: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.mediaService.getAccessUrl(key, userId);
  }

  @Post('presign')
  async generatePresignedUrls(
    @Body() body: PresignRequestDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.mediaService.generatePresignedUrls(body, userId);
  }
}
