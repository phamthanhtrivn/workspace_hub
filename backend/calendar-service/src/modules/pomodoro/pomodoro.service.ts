import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PomodoroSessionStatus,
  PomodoroSessionType,
  Prisma,
  PomodoroSession,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePomodoroSessionDto } from './dto/create-pomodoro-session.dto';
import { GetPomodoroSessionsQueryDto } from './dto/get-pomodoro-sessions-query.dto';
import { SavePomodoroConfigDto } from './dto/save-pomodoro-config.dto';
import { SavePomodoroTimerStateDto } from './dto/save-pomodoro-timer-state.dto';

const MAX_RANGE_MS = 93 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_CONFIG: SavePomodoroConfigDto = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 2,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundType: 'chime',
  soundVolume: 0.7,
  notificationEnabled: true,
  dailyGoalPomodoros: 8,
};

function withDurationMinutes(session: PomodoroSession) {
  return {
    ...session,
    durationMinutes: Math.round(
      (session.status === PomodoroSessionStatus.COMPLETED
        ? session.plannedSeconds
        : session.actualSeconds) / 60,
    ),
  };
}

function dateInTimeZone(timeZone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new BadRequestException('Invalid time zone');
  }
  return (instant: Date) => {
    const parts = formatter.formatToParts(instant);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
}

function searchWindow(date: string) {
  const midnight = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(midnight.getTime()) ||
    midnight.toISOString().slice(0, 10) !== date
  ) {
    throw new BadRequestException('Invalid date');
  }
  return {
    startAt: new Date(midnight.getTime() - DAY_MS),
    endAt: new Date(midnight.getTime() + 2 * DAY_MS),
    midnight,
  };
}

@Injectable()
export class PomodoroService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(userId: string) {
    return (
      (await this.prisma.pomodoroConfig.findUnique({ where: { userId } })) ?? {
        userId,
        ...DEFAULT_CONFIG,
      }
    );
  }

  async saveConfig(userId: string, dto: SavePomodoroConfigDto) {
    return this.prisma.pomodoroConfig.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

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

  async today(userId: string, timeZone = DEFAULT_TIME_ZONE) {
    const localDate = dateInTimeZone(timeZone);
    const today = localDate(new Date());
    const { startAt, endAt } = searchWindow(today);
    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: { gte: startAt, lt: endAt },
      },
      orderBy: { startedAt: 'desc' },
    });
    return sessions
      .filter((session) => localDate(session.startedAt) === today)
      .map(withDurationMinutes);
  }

  async dailyStats(
    userId: string,
    date?: string,
    timeZone = DEFAULT_TIME_ZONE,
  ) {
    const localDate = dateInTimeZone(timeZone);
    const selectedDate = date ?? localDate(new Date());
    const { startAt, endAt, midnight } = searchWindow(selectedDate);
    const streakStart = new Date(startAt.getTime() - 366 * DAY_MS);
    const [sessions, streakDates, config] = await Promise.all([
      this.prisma.pomodoroSession.findMany({
        where: { userId, startedAt: { gte: startAt, lt: endAt } },
        select: {
          startedAt: true,
          sessionType: true,
          status: true,
          actualSeconds: true,
          taskId: true,
          eventId: true,
          interruptionReason: true,
        },
      }),
      this.prisma.pomodoroSession.findMany({
        where: {
          userId,
          sessionType: PomodoroSessionType.FOCUS,
          status: PomodoroSessionStatus.COMPLETED,
          startedAt: { gte: streakStart, lt: endAt },
        },
        select: { startedAt: true },
      }),
      this.getConfig(userId),
    ]);
    const dailySessions = sessions.filter(
      (session) => localDate(session.startedAt) === selectedDate,
    );
    const focus = dailySessions.filter(
      (session) => session.sessionType === PomodoroSessionType.FOCUS,
    );
    const completed = focus.filter(
      (session) => session.status === PomodoroSessionStatus.COMPLETED,
    );
    const interruptionCounts: Record<string, number> = {};
    for (const session of dailySessions) {
      if (session.interruptionReason) {
        interruptionCounts[session.interruptionReason] =
          (interruptionCounts[session.interruptionReason] ?? 0) + 1;
      }
    }
    const completedDays = new Set(
      streakDates.map((session) => localDate(session.startedAt)),
    );
    let streak = 0;
    let cursor = completedDays.has(selectedDate)
      ? midnight.getTime()
      : midnight.getTime() - DAY_MS;
    while (completedDays.has(new Date(cursor).toISOString().slice(0, 10))) {
      streak += 1;
      cursor -= DAY_MS;
    }
    return {
      date: selectedDate,
      totalFocusMinutes: Math.round(
        focus.reduce((sum, session) => sum + session.actualSeconds, 0) / 60,
      ),
      completedPomodoros: completed.length,
      completedTasks: new Set(
        completed
          .map((session) => session.taskId ?? session.eventId)
          .filter(Boolean),
      ).size,
      dailyGoalPomodoros: config.dailyGoalPomodoros,
      currentStreak: streak,
      interruptionCounts,
    };
  }

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

  async list(userId: string, query: GetPomodoroSessionsQueryDto) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    if (
      endAt <= startAt ||
      endAt.getTime() - startAt.getTime() > MAX_RANGE_MS
    ) {
      throw new BadRequestException(
        'Date range must be positive and at most 93 days',
      );
    }
    const where: Prisma.PomodoroSessionWhereInput = {
      userId,
      startedAt: { gte: startAt, lt: endAt },
      ...(query.eventId ? { eventId: query.eventId } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
    };
    const focusWhere: Prisma.PomodoroSessionWhereInput = {
      ...where,
      sessionType: PomodoroSessionType.FOCUS,
    };
    const [sessions, total, focusAggregate, completedFocusSessions] =
      await Promise.all([
        this.prisma.pomodoroSession.findMany({
          where,
          orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.pomodoroSession.count({ where }),
        this.prisma.pomodoroSession.aggregate({
          where: focusWhere,
          _sum: { actualSeconds: true },
        }),
        this.prisma.pomodoroSession.count({
          where: { ...focusWhere, status: PomodoroSessionStatus.COMPLETED },
        }),
      ]);
    return {
      sessions: sessions.map(withDurationMinutes),
      summary: {
        focusSeconds: focusAggregate._sum.actualSeconds ?? 0,
        completedFocusSessions,
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
