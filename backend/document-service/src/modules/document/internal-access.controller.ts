import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  ForbiddenException,
} from '@nestjs/common';
import { isEmail, isUUID } from 'class-validator';
import { assertServiceKey } from '../../common/internal-service-key';
import { DocumentService } from './document.service';

@Controller('internal/document-access')
export class InternalDocumentAccessController {
  constructor(private readonly documents: DocumentService) {}

  @Post('resolve')
  async resolve(
    @Headers('x-internal-service-key') key: string,
    @Body() body: { userId: string; userEmail: string; documentIds: string[] },
  ) {
    assertServiceKey(
      key,
      process.env.CALENDAR_DOCUMENT_SERVICE_KEY,
      process.env.CALENDAR_DOCUMENT_SERVICE_KEY_PREVIOUS,
    );
    if (
      !isUUID(body?.userId) ||
      !isEmail(body?.userEmail) ||
      !Array.isArray(body?.documentIds) ||
      !body.documentIds.length ||
      body.documentIds.length > 50 ||
      body.documentIds.some((id) => !isUUID(id))
    )
      throw new BadRequestException('Invalid access request');
    const ids = [...new Set(body.documentIds)];
    await Promise.all(
      ids.map(async (id) => {
        const item = await this.documents.checkPermission(
          id,
          body.userId,
          body.userEmail,
        );
        if (item.isArchived || item.type !== 'FILE')
          throw new ForbiddenException('Document unavailable');
      }),
    );
    return { message: 'Document access verified', data: { documentIds: ids } };
  }
}
