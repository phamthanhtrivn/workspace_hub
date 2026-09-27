import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PomodoroSessionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePomodoroSessionDto } from './dto/create-pomodoro-session.dto';
import { GetPomodoroSessionsQueryDto } from './dto/get-pomodoro-sessions-query.dto';

const MAX_RANGE_MS = 93 * 24 * 60 * 60 * 1000;

@Injectable()
export class PomodoroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePomodoroSessionDto) {
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    if (endedAt < startedAt || endedAt.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('Invalid session time');
    }
    const elapsed = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    if (dto.actualSeconds > elapsed + 2) {
      throw new BadRequestException('Actual duration exceeds elapsed time');
    }
    if (dto.eventId) {
      const event = await this.prisma.calendarEvent.findUnique({
        where: { id: dto.eventId },
        select: { calendar: { select: { ownerUserId: true } }, sourceId: true, sourceType: true },
      });
      if (!event) throw new NotFoundException('Calendar event not found');
      if (event.calendar.ownerUserId !== userId) throw new ForbiddenException('Cannot attach a session to this event');
      if (dto.taskId && event.sourceType === 'TASK' && event.sourceId && dto.taskId !== event.sourceId) {
        throw new BadRequestException('Task does not match calendar event');
      }
    }
    return this.prisma.pomodoroSession.create({
      data: {
        userId, eventId: dto.eventId, taskId: dto.taskId,
        sessionType: dto.sessionType, status: dto.status,
        startedAt, endedAt, plannedSeconds: dto.plannedSeconds,
        actualSeconds: dto.actualSeconds, notes: dto.notes,
        interruptionReason: dto.interruptionReason,
      },
    });
  }

  async list(userId: string, query: GetPomodoroSessionsQueryDto) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    if (endAt <= startAt || endAt.getTime() - startAt.getTime() > MAX_RANGE_MS) {
      throw new BadRequestException('Date range must be positive and at most 93 days');
    }
    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        userId, startedAt: { gte: startAt, lt: endAt },
        ...(query.eventId ? { eventId: query.eventId } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: 1000,
    });
    const summary = sessions.reduce((result, session) => {
      if (session.sessionType === PomodoroSessionType.FOCUS) {
        result.focusSeconds += session.actualSeconds;
        if (session.status === 'COMPLETED') result.completedFocusSessions += 1;
      }
      return result;
    }, { focusSeconds: 0, completedFocusSessions: 0 });
    return { sessions, summary };
  }
}
