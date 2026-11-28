import {
  withDurationMinutes,
  dateInTimeZone,
  searchWindow,
} from './utils/pomodoro-session.utils';
import {
  MAX_RANGE_MS,
  DAY_MS,
  DEFAULT_TIME_ZONE,
} from './constants/pomodoro.constants';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PomodoroSessionStatus,
  PomodoroSessionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GetPomodoroSessionsQueryDto } from './dto/get-pomodoro-sessions-query.dto';
import { PomodoroConfigService } from './pomodoro-config.service';

@Injectable()
export class PomodoroStatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: PomodoroConfigService,
  ) {}
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
      this.config.getConfig(userId),
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
