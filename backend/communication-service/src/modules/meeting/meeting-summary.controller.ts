import { IndependentAuthentication } from '../../common/decorators/http-authentication.decorator';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { RecordingAuthGuard } from '../../common/auth/recording-auth.guard';
import { MeetingRecordingService } from './services/meeting-recording.service';

@Controller('api/meetings/recordings')
@UseGuards(RecordingAuthGuard)
export class MeetingSummaryController {
  constructor(private readonly recordings: MeetingRecordingService) {}

  private async proxy(id: string, userId: string, start: boolean) {
    const detail = await this.recordings.detail(id, userId);
    const enabled = process.env.MEETING_SUMMARY_ENABLED === 'true';
    if (!enabled) {
      if (start)
        throw new ServiceUnavailableException(
          'Meeting summaries are not configured',
        );
      return {
        message: 'Meeting summary',
        data: { enabled: false, status: 'NOT_CREATED', canCreate: false },
      };
    }
    // Only the owner may authorize paid transcription and external processing.
    if (start) await this.recordings.summarySource(id, userId);
    const key = process.env.AI_COMMUNICATION_SERVICE_KEY || '';
    if (key.length < 32) throw new ServiceUnavailableException();
    let response: Response;
    try {
      response = await fetch(
        `${(process.env.AI_SERVICE_URL || 'http://localhost:8087').replace(/\/$/, '')}/internal/meeting-summaries/${id}${start ? '' : '/status'}`,
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(20000),
          headers: {
            'content-type': 'application/json',
            'x-internal-service-key': key,
          },
          body: JSON.stringify({ actorId: userId }),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Meeting summary service is unavailable',
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceUnavailableException(
        'Meeting summary service is unavailable or not configured',
      );
    }
    // Recheck access after waiting for the downstream request.
    await this.recordings.detail(id, userId);
    return {
      message: 'Meeting summary',
      data: {
        ...((await response.json()) as object),
        enabled: true,
        canCreate: detail.ownerId === userId && detail.status === 'COMPLETED',
      },
    };
  }

  @Get(':id/summary')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.proxy(id, userId, false);
  }

  @Post(':id/summary')
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.proxy(id, userId, true);
  }
}

@IndependentAuthentication()
@Controller('internal/meeting-summaries')
export class MeetingSummarySourceController {
  constructor(private readonly recordings: MeetingRecordingService) {}

  @Post(':id/source')
  source(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-internal-service-key') key: string,
    @Body('actorId', ParseUUIDPipe) actorId: string,
  ) {
    const expected = process.env.AI_COMMUNICATION_SERVICE_KEY || '';
    if (process.env.MEETING_SUMMARY_ENABLED !== 'true' || expected.length < 32)
      throw new ServiceUnavailableException();
    if (
      typeof key !== 'string' ||
      Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
    )
      throw new UnauthorizedException();
    return this.recordings.summarySource(id, actorId);
  }
}
