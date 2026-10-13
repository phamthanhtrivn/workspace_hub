import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MeetingPolicyService } from './meeting-policy.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';

@Injectable()
export class MeetingCaptionsService {
  constructor(
    private readonly policy: MeetingPolicyService,
    private readonly livekit: LiveKitService,
  ) {}

  private configured() {
    return Boolean(
      process.env.CAPTION_SERVICE_URL && process.env.CAPTION_SERVICE_TOKEN,
    );
  }

  async status(joinToken: string, userId: string) {
    await this.policy.assertJoinedMeetingParticipant({ joinToken, userId });
    return { available: this.configured(), language: 'vi' };
  }

  async start(joinToken: string, userId: string) {
    const { meeting } = await this.policy.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    if (
      !(await this.livekit.isParticipantConnected(meeting.roomName, userId))
    ) {
      throw new HttpException('Join the meeting before enabling captions', 403);
    }
    return this.request('/sessions', 'POST', {
      meetingId: meeting.id,
      roomName: meeting.roomName,
      viewerId: userId,
    });
  }

  async release(joinToken: string, userId: string) {
    try {
      const { meeting } = await this.policy.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
      return await this.request(
        `/sessions/${meeting.id}/viewers/${userId}`,
        'DELETE',
      );
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        error.message === String(MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE)
      ) {
        return { released: true };
      }
      throw error;
    }
  }

  private async request(path: string, method: string, body?: object) {
    if (!this.configured()) {
      throw new ServiceUnavailableException('Live captions are not configured');
    }
    let response: Response;
    try {
      response = await fetch(
        `${process.env.CAPTION_SERVICE_URL!.replace(/\/$/, '')}${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${process.env.CAPTION_SERVICE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(20_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Live captions are temporarily unavailable. Please try again.',
      );
    }
    if (response.status === 429) {
      throw new HttpException(
        'Live captions are at capacity. Please try again later.',
        429,
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Live captions are temporarily unavailable. Please try again.',
      );
    }
    return response.json() as Promise<{
      workerIdentity?: string;
      language?: string;
      released?: boolean;
    }>;
  }
}
