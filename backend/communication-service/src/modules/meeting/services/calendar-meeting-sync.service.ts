import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyncCalendarMeetingDto } from '../dto/sync-calendar-meeting.dto';
import { createJoinToken, createRoomName } from '../utils/meeting.utils';

@Injectable()
export class CalendarMeetingSyncService {
  constructor(private readonly prisma: PrismaService) {}
  async lookup(joinToken: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { joinToken },
      select: {
        id: true,
        joinToken: true,
        createdBy: true,
        calendarEventId: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
      },
    });
    return meeting;
  }
  async sync(dto: SyncCalendarMeetingDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.eventId}, 8083))::text`;
      let meeting = await tx.meeting.findUnique({
        where: { calendarEventId: dto.eventId },
      });
      const watermark = await tx.calendarMeetingSyncState.findUnique({
        where: { eventId: dto.eventId },
      });
      const revision = BigInt(dto.revision);
      if (watermark && watermark.revision >= revision)
        return {
          id: meeting?.id ?? null,
          joinToken: meeting?.joinToken ?? null,
        };
      if (!meeting && dto.adoptJoinToken) {
        const legacy = await tx.meeting.findUnique({
          where: { joinToken: dto.adoptJoinToken },
        });
        if (
          !legacy ||
          legacy.createdBy !== dto.hostId ||
          (legacy.calendarEventId && legacy.calendarEventId !== dto.eventId) ||
          legacy.scheduledStartAt?.getTime() !==
            new Date(dto.scheduledStartAt).getTime()
        ) {
          throw new ForbiddenException(
            'Legacy meeting cannot be bound to this occurrence',
          );
        }
        meeting = await tx.meeting.update({
          where: { id: legacy.id },
          data: { calendarEventId: dto.eventId },
        });
      }
      if (meeting && meeting.createdBy !== dto.hostId)
        throw new ForbiddenException(
          'Meeting owner does not match calendar event',
        );
      if (meeting && meeting.calendarSyncRevision >= revision)
        return { id: meeting.id, joinToken: meeting.joinToken };
      await tx.calendarMeetingSyncState.upsert({
        where: { eventId: dto.eventId },
        create: { eventId: dto.eventId, revision },
        update: { revision },
      });
      const start = new Date(dto.scheduledStartAt),
        end = new Date(dto.scheduledEndAt);
      if (!meeting) {
        if (!dto.enabled || start <= new Date() || end <= start)
          return { id: null, joinToken: null };
        meeting = await tx.meeting.create({
          data: {
            calendarEventId: dto.eventId,
            calendarSyncRevision: revision,
            roomName: createRoomName(),
            joinToken: createJoinToken(),
            title: dto.title,
            description: dto.description,
            createdBy: dto.hostId,
            hostId: dto.hostId,
            type: MeetingType.SCHEDULED,
            status: MeetingStatus.SCHEDULED,
            scheduledStartAt: start,
            scheduledEndAt: end,
          },
        });
      } else {
        const editableSchedule =
          (meeting.status === MeetingStatus.SCHEDULED ||
            (meeting.status === MeetingStatus.CANCELLED &&
              meeting.calendarCancelled &&
              dto.enabled)) &&
          !!meeting.scheduledStartAt &&
          meeting.scheduledStartAt > new Date();
        meeting = await tx.meeting.update({
          where: { id: meeting.id },
          data: {
            calendarSyncRevision: revision,
            ...(editableSchedule
              ? {
                  title: dto.title,
                  description: dto.description,
                  ...(dto.enabled && start > new Date() && end > start
                    ? {
                        scheduledStartAt: start,
                        scheduledEndAt: end,
                        status: MeetingStatus.SCHEDULED,
                        cancelledAt: null,
                        calendarCancelled: false,
                      }
                    : {}),
                  ...(!dto.enabled
                    ? {
                        status: MeetingStatus.CANCELLED,
                        cancelledAt: new Date(),
                        calendarCancelled: true,
                      }
                    : {}),
                }
              : {}),
          },
        });
      }
      if (dto.enabled && meeting.status === MeetingStatus.SCHEDULED) {
        const users = [...new Set([dto.hostId, ...dto.inviteeIds])];
        await tx.meetingParticipant.deleteMany({
          where: {
            meetingId: meeting.id,
            userId: { notIn: users },
            status: {
              in: [
                MeetingParticipantStatus.INVITED,
                MeetingParticipantStatus.APPROVED,
                MeetingParticipantStatus.REJECTED,
              ],
            },
          },
        });
        await tx.meetingParticipant.createMany({
          data: users.map((userId) => ({
            meetingId: meeting.id,
            userId,
            role:
              userId === dto.hostId
                ? MeetingRole.HOST
                : MeetingRole.PARTICIPANT,
            status: MeetingParticipantStatus.APPROVED,
            invitedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }
      return { id: meeting.id, joinToken: meeting.joinToken };
    });
  }
}
