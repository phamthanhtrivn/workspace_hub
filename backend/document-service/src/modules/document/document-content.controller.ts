import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IndependentAuthentication } from '../../common/decorators/http-authentication.decorator';
import { DocumentContentService } from './document-content.service';

@IndependentAuthentication()
@Controller('api/documents/public')
export class DocumentContentController {
  constructor(private readonly content: DocumentContentService) {}
  @Get('content')
  stream(
    @Query('ticket') ticket: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    return this.content.stream(ticket, request, response);
  }
}
