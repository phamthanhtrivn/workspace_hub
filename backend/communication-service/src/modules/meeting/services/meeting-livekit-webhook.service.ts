import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import { MeetingRoomService } from './meeting-room.service';
import { MeetingRecordingWorker } from './meeting-recording.worker';

@Injectable()
export class MeetingLiveKitWebhookService {
  private readonly logger = new Logger(MeetingLiveKitWebhookService.name);

  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly meetingRoomService: MeetingRoomService,
    private readonly recordingWorker: MeetingRecordingWorker,
  ) {}

  async handleWebhook(rawBody: string, authorization?: string) {
    if (!rawBody) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.LIVEKIT_WEBHOOK_BODY_REQUIRED,
      );
    }

    let event: Awaited<ReturnType<LiveKitService['receiveWebhook']>>;

    try {
      event = await this.liveKitService.receiveWebhook(rawBody, authorization);
    } catch (error) {
      this.logger.warn(
        `Rejected LiveKit webhook: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new UnauthorizedException(
        MEETING_ERROR_MESSAGES.LIVEKIT_WEBHOOK_INVALID,
      );
    }

    if (
      ['egress_started', 'egress_updated', 'egress_ended'].includes(event.event)
    ) {
      return {
        event: event.event,
        handled: event.egressInfo
          ? await this.recordingWorker.applyEgress(event.egressInfo)
          : false,
      };
    }

    if (event.event !== 'room_finished') {
      return {
        event: event.event,
        handled: false,
      };
    }

    const roomName = event.room?.name?.trim();

    if (!roomName) {
      this.logger.warn(
        'Ignored LiveKit room_finished webhook without room name',
      );
      return {
        event: event.event,
        handled: false,
      };
    }

    const result =
      await this.meetingRoomService.endMeetingFromLiveKitRoomFinished({
        roomName,
        endedAt: this.toWebhookDate(event.createdAt),
        webhookEventId: event.id || undefined,
      });

    if (result.status === 'ignored_unknown_room') {
      this.logger.warn(
        `Ignored LiveKit room_finished webhook for unknown room ${roomName}`,
      );
    }

    return {
      event: event.event,
      roomName,
      handled: result.status === 'ended',
      status: result.status,
    };
  }

  private toWebhookDate(createdAt?: bigint) {
    if (!createdAt || createdAt <= BigInt(0)) {
      return new Date();
    }

    return new Date(Number(createdAt) * 1000);
  }
}
