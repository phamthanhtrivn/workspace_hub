import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const POLL_MS = 3_000;
const MAX_BACKOFF_MS = 300_000;
const REQUEST_TIMEOUT_MS = 10_000;
const SYNC_LEASE_MS = 30_000;
export const ConferenceStatus = { NONE: 'NONE', PENDING: 'PENDING', READY: 'READY', FAILED: 'FAILED' } as const;
const INTERNAL_SYNC_PATH = '/api/meetings/internal/calendar-sync';

@Injectable()
export class CalendarConferenceSyncService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(CalendarConferenceSyncService.name);
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.drain().catch(error => this.logger.error(error)), POLL_MS);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async reconcileCalendar(tx: Prisma.TransactionClient, calendarId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${calendarId}, 8086))::text`;
    const events = await tx.calendarEvent.findMany({ where: { calendarId }, include: { attendees: true } });
    const bindings = await tx.calendarConference.findMany({ where: { calendarId } });
    const byId = new Map(bindings.map(binding => [binding.eventId, binding]));
    for (const event of events) {
      const previous = byId.get(event.id);
      byId.delete(event.id);
      if (!event.conferenceEnabled && !previous) continue;
      const enabled = event.conferenceEnabled && event.status !== 'CANCELLED';
      const payload = {
        ...(previous && typeof (previous.payload as Prisma.JsonObject).adoptJoinToken === 'string' ? { adoptJoinToken: (previous.payload as Prisma.JsonObject).adoptJoinToken } : {}),
        eventId: event.id, hostId: event.createdBy, enabled,
        title: event.title, description: event.description,
        scheduledStartAt: event.startAt.toISOString(), scheduledEndAt: event.endAt.toISOString(),
        inviteeIds: event.attendees.filter(attendee => attendee.responseStatus === 'ACCEPTED' && attendee.userId !== event.createdBy).map(attendee => attendee.userId).sort(),
      };
      const signature = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      if (previous?.signature === signature) continue;
      await tx.calendarConference.upsert({ where: { eventId: event.id }, create: {
        eventId: event.id, calendarId, hostId: event.createdBy, enabled, signature, payload,
      }, update: { enabled, signature, payload, revision: { increment: 1 }, status: ConferenceStatus.PENDING,
        nextAttemptAt: new Date(), attemptCount: 0, lastError: null } });
    }
    // Bindings intentionally survive occurrence deletion so cancellation is durable.
    for (const previous of byId.values()) {
      if (!previous.enabled) continue;
      const payload = { ...(previous.payload as Prisma.JsonObject), enabled: false };
      await tx.calendarConference.update({ where: { eventId: previous.eventId }, data: {
        enabled: false, payload, revision: { increment: 1 }, status: ConferenceStatus.PENDING,
        nextAttemptAt: new Date(), attemptCount: 0,
      } });
    }
  }

  async attach<T extends { id: string }>(events: T[]) {
    const bindings = await this.prisma.calendarConference.findMany({ where: { eventId: { in: events.map(event => event.id) } } });
    const byId = new Map(bindings.map(binding => [binding.eventId, binding]));
    return events.map(event => {
      const binding = byId.get(event.id);
      return { ...event, conference: {
        enabled: binding?.enabled ?? false, status: binding?.enabled ? binding.status : ConferenceStatus.NONE,
        meetingId: binding?.status === ConferenceStatus.READY ? binding.meetingId : null,
        joinToken: binding?.status === ConferenceStatus.READY ? binding.joinToken : null,
        message: binding?.lastError ?? null,
      } };
    });
  }

  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      // Include new occurrences produced by the rolling recurrence materializer.
      const calendars = await this.prisma.calendar.findMany({ where: { OR: [
        { events: { some: { conferenceEnabled: true } } },
        { recurrenceSeries: { some: { conferenceEnabled: true } } },
      ] }, select: { id: true } });
      const boundCalendars = await this.prisma.calendarConference.findMany({ where: { enabled: true }, select: { calendarId: true }, distinct: ['calendarId'] });
      for (const calendarId of new Set([...calendars.map(calendar => calendar.id), ...boundCalendars.map(binding => binding.calendarId)])) await this.prisma.$transaction(tx => this.reconcileCalendar(tx, calendarId));
      const jobs = await this.prisma.calendarConference.findMany({ where: { status: { in: [ConferenceStatus.PENDING, ConferenceStatus.FAILED] }, nextAttemptAt: { lte: new Date() } }, take: 30, orderBy: { nextAttemptAt: 'asc' } });
      if (jobs.length) this.logger.debug(`Conference backlog batch=${jobs.length} oldestDelayMs=${Math.max(0, Date.now() - jobs[0].nextAttemptAt.getTime())}`);
      for (const job of jobs) {
        const claimed = await this.prisma.calendarConference.updateMany({ where: { eventId: job.eventId, revision: job.revision, nextAttemptAt: { lte: new Date() } }, data: { nextAttemptAt: new Date(Date.now() + SYNC_LEASE_MS) } });
        if (!claimed.count) continue;
        try {
          const key = process.env.INTERNAL_SERVICE_KEY;
          const serviceUrl = process.env.COMMUNICATION_SERVICE_URL;
          if (!key || !serviceUrl) throw new Error('Meeting service is not configured');
          const response = await fetch(`${serviceUrl}${INTERNAL_SYNC_PATH}`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-service-key': key },
            body: JSON.stringify({ ...(job.payload as Prisma.JsonObject), revision: job.revision.toString() }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'error',
          });
          if (!response.ok) throw new Error('Meeting service is temporarily unavailable');
          const result = await response.json() as { data: { id: string | null; joinToken: string | null } };
          if (job.enabled && (!result.data?.id || !result.data.joinToken)) throw new Error('Meeting could not be prepared for this event');
          await this.prisma.calendarConference.updateMany({ where: { eventId: job.eventId, revision: job.revision }, data: {
            status: job.enabled ? ConferenceStatus.READY : ConferenceStatus.NONE,
            meetingId: result.data.id, joinToken: result.data.joinToken, lastError: null,
          } });
        } catch (error) {
          await this.prisma.calendarConference.updateMany({ where: { eventId: job.eventId, revision: job.revision }, data: {
            status: ConferenceStatus.FAILED, attemptCount: { increment: 1 },
            nextAttemptAt: new Date(Date.now() + Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** Math.min(job.attemptCount, 7))),
            lastError: error instanceof Error ? error.message : 'Unable to prepare meeting',
          } });
          this.logger.warn(`Conference sync failed for occurrence ${job.eventId}, revision ${job.revision}`);
        }
      }
    } finally { this.running = false; }
  }
}
