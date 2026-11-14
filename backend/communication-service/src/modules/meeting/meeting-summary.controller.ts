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
import { MeetingSummaryService } from './services/meeting-summary.service';

@Controller('api/meetings/recordings')
@UseGuards(RecordingAuthGuard)
export class MeetingSummaryController {
  constructor(private readonly summaries: MeetingSummaryService) {}

  @Get(':id/summary')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.summaries.get(id, userId);
  }

  @Post(':id/summary')
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.summaries.start(id, userId);
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
    const expected = process.env.AI_TO_COMMUNICATION_KEY || '';
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
