import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import { DocumentBulkService } from './document-bulk.service';
import { DocumentBulkDto } from './dto/document-bulk.dto';
import { DOCUMENT_BULK } from './types/document-bulk.constants';

@Controller('api/documents/bulk')
export class DocumentBulkController {
  constructor(private readonly bulk: DocumentBulkService) {}

  @Post()
  async execute(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Body() dto: DocumentBulkDto,
  ) {
    if (!userId || !userEmail)
      throw new BadRequestException('Missing x-user-id or x-user-email header');

    return {
      message: DOCUMENT_BULK.SUCCESS,
      data: await this.bulk.execute(userId, userEmail, dto),
    };
  }
}
