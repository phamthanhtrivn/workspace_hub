import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MeetingRecordingService } from './meeting-recording.service';
import {
  MEETING_SUMMARY_MESSAGES,
  parseMeetingSummary,
  type MeetingSummaryResult,
} from '../types/meeting-summary.types';

const SUMMARY_REQUEST_TIMEOUT_MS = 20_000;

@Injectable()
export class MeetingSummaryService {
  constructor(private readonly recordings: MeetingRecordingService) {}

  get(id: string, userId: string) {
    return this.proxy(id, userId, false);
  }
  start(id: string, userId: string) {
    return this.proxy(id, userId, true);
  }

  private envelope(data: MeetingSummaryResult) {
    return { message: 'Meeting summary', data };
  }

  private async proxy(id: string, userId: string, start: boolean) {
    await this.recordings.detail(id, userId);
    // Only the recording owner can authorize external processing, including retries.
    if (start) await this.recordings.summarySource(id, userId);
    const enabled = process.env.MEETING_SUMMARY_ENABLED === 'true';
    if (!enabled) {
      if (start)
        throw new ServiceUnavailableException(
          MEETING_SUMMARY_MESSAGES.disabled,
        );

      return this.envelope({
        enabled: false,
        canCreate: false,
        availability: 'DISABLED',
        unavailableReason: MEETING_SUMMARY_MESSAGES.disabled,
        status: 'NOT_CREATED',
      });
    }
    let summary: ReturnType<typeof parseMeetingSummary> | undefined;
    try {
      const key = process.env.COMMUNICATION_TO_AI_KEY || '';
      if (key.length < 32) throw new Error('Summary credential not configured');
      const response = await fetch(
        `${(process.env.AI_SERVICE_URL || 'http://localhost:8087').replace(/\/$/, '')}/internal/meeting-summaries/${encodeURIComponent(id)}${start ? '' : '/status'}`,
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(SUMMARY_REQUEST_TIMEOUT_MS),
          headers: {
            'content-type': 'application/json',
            'x-internal-service-key': key,
          },
          body: JSON.stringify({ actorId: userId }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('Summary dependency unavailable');
      }
      summary = parseMeetingSummary(await response.json());
    } catch {
      // Keep dependency failures separate from access revocation after the request.
    }
    const current = await this.recordings.detail(id, userId);
    if (!summary) {
      if (start)
        throw new ServiceUnavailableException(
          MEETING_SUMMARY_MESSAGES.unavailable,
        );

      return this.envelope({
        enabled: true,
        canCreate: false,
        availability: 'UNAVAILABLE',
        unavailableReason: MEETING_SUMMARY_MESSAGES.unavailable,
        status: 'NOT_CREATED',
      });
    }
    const { available, ...result } = summary;

    return this.envelope({
      ...result,
      enabled: true,
      availability: available ? 'AVAILABLE' : 'UNAVAILABLE',
      unavailableReason: !available
        ? MEETING_SUMMARY_MESSAGES.unavailable
        : current.status !== 'COMPLETED'
          ? MEETING_SUMMARY_MESSAGES.notReady
          : null,
      canCreate:
        available &&
        current.ownerId === userId &&
        current.status === 'COMPLETED',
    });
  }
}
