import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { MeetingLiveKitWebhookService } from './services/meeting-livekit-webhook.service';
import {
  MEETING_ERROR_MESSAGES,
  MEETING_SUCCESS_MESSAGES,
} from './types/meeting.enums';

@Controller('api/meetings/livekit')
export class MeetingLiveKitWebhookController {
  constructor(
    private readonly meetingLiveKitWebhookService: MeetingLiveKitWebhookService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('authorization') authorization?: string,
    @Headers('authorize') authorize?: string,
  ) {
    const rawBody = this.getRawBody(request);

    if (!rawBody) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.LIVEKIT_WEBHOOK_BODY_REQUIRED,
      );
    }

    const result = await this.meetingLiveKitWebhookService.handleWebhook(
      rawBody,
      authorization ?? authorize,
    );

    return {
      message: MEETING_SUCCESS_MESSAGES.LIVEKIT_WEBHOOK_RECEIVED,
      data: result,
    };
  }

  private getRawBody(request: RawBodyRequest<Request>) {
    if (request.rawBody) {
      return request.rawBody.toString('utf8');
    }

    if (Buffer.isBuffer(request.body)) {
      return request.body.toString('utf8');
    }

    if (typeof request.body === 'string') {
      return request.body;
    }

    return null;
  }
}
