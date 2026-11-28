import { withDurationMinutes } from './utils/pomodoro-session.utils';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PomodoroSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePomodoroSessionDto } from './dto/create-pomodoro-session.dto';

@Injectable()
export class PomodoroSessionService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, dto: CreatePomodoroSessionDto) {
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    if (endedAt < startedAt || endedAt.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('Invalid session time');
    }
    const elapsed = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000,
    );
    if (dto.actualSeconds > elapsed + 2) {
      throw new BadRequestException('Actual duration exceeds elapsed time');
    }
    if (
      dto.status === PomodoroSessionStatus.COMPLETED &&
      dto.actualSeconds < dto.plannedSeconds
    ) {
      throw new BadRequestException(
        'Completed session is shorter than planned',
      );
    }
    let resolvedTaskId = dto.taskId;
    let resolvedTaskTitle = dto.taskTitle;
    let resolvedProjectId = dto.projectId;
    let resolvedProjectName = dto.projectName;
    if (dto.eventId) {
      const event = await this.prisma.calendarEvent.findUnique({
        where: { id: dto.eventId },
        select: {
          title: true,
          calendar: {
            select: { ownerUserId: true, projectId: true, name: true },
          },
          sourceId: true,
          sourceType: true,
        },
      });
      if (!event) throw new NotFoundException('Calendar event not found');
      if (event.calendar.ownerUserId !== userId)
        throw new ForbiddenException('Cannot attach a session to this event');
      if (
        dto.taskId &&
        event.sourceType === 'TASK' &&
        event.sourceId &&
        dto.taskId !== event.sourceId
      ) {
        throw new BadRequestException('Task does not match calendar event');
      }
      if (event.sourceType === 'TASK' && event.sourceId) {
        resolvedTaskId = event.sourceId;
      }
      if (
        dto.projectId &&
        event.calendar.projectId &&
        dto.projectId !== event.calendar.projectId
      ) {
        throw new BadRequestException('Project does not match calendar event');
      }
      resolvedTaskTitle ??= event.title;
      resolvedProjectId ??= event.calendar.projectId ?? undefined;
      resolvedProjectName ??= event.calendar.projectId
        ? event.calendar.name
        : undefined;
    }
    const data: Prisma.PomodoroSessionUncheckedCreateInput = {
      userId,
      clientSessionId: dto.clientSessionId,
      eventId: dto.eventId,
      taskId: resolvedTaskId,
      taskTitle: resolvedTaskTitle,
      projectId: resolvedProjectId,
      projectName: resolvedProjectName,
      sessionType: dto.sessionType,
      status: dto.status,
      startedAt,
      endedAt,
      plannedSeconds: dto.plannedSeconds,
      actualSeconds: dto.actualSeconds,
      notes: dto.notes,
      interruptionReason: dto.interruptionReason,
    };
    if (dto.clientSessionId) {
      const session = await this.prisma.pomodoroSession.upsert({
        where: {
          userId_clientSessionId: {
            userId,
            clientSessionId: dto.clientSessionId,
          },
        },
        create: data,
        update: {},
      });
      return withDurationMinutes(session);
    }
    return withDurationMinutes(
      await this.prisma.pomodoroSession.create({ data }),
    );
  }
}
