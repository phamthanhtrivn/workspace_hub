import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SavePomodoroTimerStateDto } from './dto/save-pomodoro-timer-state.dto';

@Injectable()
export class PomodoroTimerService {
  constructor(private readonly prisma: PrismaService) {}
  async getState(userId: string) {
    return this.prisma.pomodoroTimerState.findUnique({ where: { userId } });
  }

  async saveState(userId: string, dto: SavePomodoroTimerStateDto) {
    if (dto.status === 'RUNNING' && (!dto.targetEndAt || !dto.sessionStartAt)) {
      throw new BadRequestException(
        'Running timer requires start and target end times',
      );
    }
    if (
      dto.targetEndAt &&
      dto.sessionStartAt &&
      new Date(dto.targetEndAt) <= new Date(dto.sessionStartAt)
    ) {
      throw new BadRequestException('Timer end must be after its start');
    }
    if (dto.activeTask && JSON.stringify(dto.activeTask).length > 8192) {
      throw new BadRequestException('Active task snapshot is too large');
    }
    if (dto.eventId) {
      const event = await this.prisma.calendarEvent.findUnique({
        where: { id: dto.eventId },
        select: {
          calendar: { select: { ownerUserId: true } },
          sourceType: true,
          sourceId: true,
        },
      });
      if (!event) throw new NotFoundException('Calendar event not found');
      if (event.calendar.ownerUserId !== userId)
        throw new ForbiddenException('Cannot attach timer to this event');
      if (
        dto.taskId &&
        event.sourceType === 'TASK' &&
        event.sourceId &&
        dto.taskId !== event.sourceId
      ) {
        throw new BadRequestException('Task does not match calendar event');
      }
    }
    const data: Prisma.PomodoroTimerStateUncheckedUpdateInput = {
      plannedSeconds: dto.plannedSeconds,
      mode: dto.mode,
      status: dto.status,
      targetEndAt: dto.targetEndAt ? new Date(dto.targetEndAt) : null,
      remainingSeconds: dto.remainingSeconds,
      cycleCount: dto.cycleCount,
      sessionStartAt: dto.sessionStartAt ? new Date(dto.sessionStartAt) : null,
      eventId: dto.eventId ?? null,
      taskId: dto.taskId ?? null,
      activeTask: dto.activeTask
        ? (dto.activeTask as Prisma.InputJsonValue)
        : Prisma.DbNull,
      notes: dto.notes,
    };
    if (dto.expectedVersion === 0) {
      try {
        return await this.prisma.pomodoroTimerState.create({
          data: {
            ...data,
            userId,
            version: 1,
          } as Prisma.PomodoroTimerStateUncheckedCreateInput,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Timer state changed on another device');
        }
        throw error;
      }
    }
    try {
      return await this.prisma.pomodoroTimerState.update({
        where: { userId, version: dto.expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Timer state changed on another device');
      }
      throw error;
    }
  }

  async deleteState(userId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException('Expected timer state version is required');
    }
    try {
      return await this.prisma.pomodoroTimerState.update({
        where: { userId, version: expectedVersion },
        data: {
          status: 'IDLE',
          targetEndAt: null,
          remainingSeconds: 0,
          plannedSeconds: null,
          sessionStartAt: null,
          eventId: null,
          taskId: null,
          activeTask: Prisma.DbNull,
          notes: '',
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Timer state changed on another device');
      }
      throw error;
    }
  }
}
