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

    if (
      payload.eventType === 'PROJECT_TASK_CALENDAR_REMOVED' ||
      (!task.startAt && !task.endAt)
    ) {
      await this.prisma.calendarEvent.deleteMany({
        where: { sourceType: EventSourceType.TASK, sourceId: task.id },
      });
      return;
    }

    await this.prisma.calendarEvent.deleteMany({
      where: {
        sourceType: EventSourceType.TASK,
        sourceId: task.id,
        calendar: { ownerUserId: { notIn: recipientUserIds } },
      },
    });

    const startAt = new Date(task.startAt ?? task.endAt!);
    let endAt = new Date(task.endAt ?? task.startAt!);
    if (endAt <= startAt) {
      endAt = new Date(
        startAt.getTime() + (task.allDay ? 24 * 60 * 60_000 : 60 * 60_000),
      );
    }

    for (const ownerUserId of recipientUserIds) {
      await this.prisma.$transaction(async (tx) => {
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
      });
    }
  }
}
