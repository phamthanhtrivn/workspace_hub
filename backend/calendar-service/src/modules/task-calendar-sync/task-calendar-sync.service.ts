import { Injectable } from '@nestjs/common';
import {
  AttendeeResponseStatus,
  EventSourceType,
  EventStatus,
} from '@prisma/client';
import { CALENDAR_DEFAULTS } from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectTaskCalendarPayload } from './task-calendar-sync.types';

@Injectable()
export class TaskCalendarSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async synchronize(payload: ProjectTaskCalendarPayload): Promise<void> {
    const { task } = payload;
    const recipientUserIds = [...new Set(task.recipientUserIds)];
    const occurredAt = new Date(payload.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error('Invalid project task event timestamp');
    }

    await this.prisma.$transaction(async (tx) => {
      // Kafka retries and project-service reconciliation can publish the same
      // task concurrently. Lock per task so an older snapshot cannot commit
      // after a newer one.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${task.id}))`;

      const checkpoint = await tx.taskCalendarSyncCheckpoint.findUnique({
        where: { taskId: task.id },
      });
      if (checkpoint && checkpoint.occurredAt >= occurredAt) return;

      const shouldRemove =
        payload.eventType === 'PROJECT_TASK_CALENDAR_REMOVED' ||
        (!task.startAt && !task.endAt);
      if (shouldRemove) {
        await tx.calendarEvent.deleteMany({
          where: { sourceType: EventSourceType.TASK, sourceId: task.id },
        });
      } else {
        await tx.calendarEvent.deleteMany({
          where: {
            sourceType: EventSourceType.TASK,
            sourceId: task.id,
            calendar: { ownerUserId: { notIn: recipientUserIds } },
          },
        });

        const startAt = new Date(task.startAt ?? task.endAt!);
        let endAt = new Date(task.endAt ?? task.startAt!);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
          throw new Error('Invalid project task schedule');
        }
        if (endAt <= startAt) {
          endAt = new Date(
            startAt.getTime() + (task.allDay ? 24 * 60 * 60_000 : 60 * 60_000),
          );
        }

        for (const ownerUserId of recipientUserIds) {
          const calendar = await tx.calendar.upsert({
            where: {
              ownerUserId_projectId: {
                ownerUserId,
                projectId: task.projectId,
              },
            },
            update: {
              name: task.projectName,
              color: task.projectColor ?? CALENDAR_DEFAULTS.COLOR,
            },
            create: {
              ownerUserId,
              projectId: task.projectId,
              name: task.projectName,
              icon: '\u{1F4C1}',
              color: task.projectColor ?? CALENDAR_DEFAULTS.COLOR,
              timeZone: CALENDAR_DEFAULTS.TIMEZONE,
              isDefault: false,
              isVisible: true,
            },
          });

          const event = await tx.calendarEvent.upsert({
            where: {
              calendarId_sourceType_sourceId: {
                calendarId: calendar.id,
                sourceType: EventSourceType.TASK,
                sourceId: task.id,
              },
            },
            update: {
              title: task.title,
              description: task.description,
              startAt,
              endAt,
              allDay: task.allDay,
              color: task.projectColor ?? calendar.color,
              status: EventStatus.CONFIRMED,
              cancelledAt: null,
            },
            create: {
              calendarId: calendar.id,
              createdBy: task.createdBy,
              title: task.title,
              description: task.description,
              startAt,
              endAt,
              allDay: task.allDay,
              color: task.projectColor ?? calendar.color,
              sourceType: EventSourceType.TASK,
              sourceId: task.id,
            },
          });

          await tx.calendarEventAttendee.upsert({
            where: {
              eventId_userId: { eventId: event.id, userId: ownerUserId },
            },
            update: {},
            create: {
              eventId: event.id,
              userId: ownerUserId,
              responseStatus: AttendeeResponseStatus.ACCEPTED,
            },
          });
        }
      }

      await tx.taskCalendarSyncCheckpoint.upsert({
        where: { taskId: task.id },
        create: {
          taskId: task.id,
          occurredAt,
          eventType: payload.eventType,
        },
        update: { occurredAt, eventType: payload.eventType },
      });
    });
  }
}
