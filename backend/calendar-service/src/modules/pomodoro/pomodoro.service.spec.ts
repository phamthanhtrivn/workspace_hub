import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  PomodoroSessionStatus,
  PomodoroSessionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PomodoroService } from './pomodoro.service';

describe('PomodoroService', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const eventId = '22222222-2222-2222-2222-222222222222';
  const taskId = '33333333-3333-3333-3333-333333333333';
  const prisma = {
    pomodoroConfig: { findUnique: jest.fn(), upsert: jest.fn() },
    pomodoroSession: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    pomodoroTimerState: {
      create: jest.fn(),
      update: jest.fn(),
    },
    calendarEvent: { findUnique: jest.fn() },
  };
  const service = new PomodoroService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('calculates daily focus, distinct tasks, interruptions and a consecutive streak', async () => {
    prisma.pomodoroSession.findMany
      .mockResolvedValueOnce([
        {
          startedAt: new Date('2026-09-27T08:00:00Z'),
          sessionType: PomodoroSessionType.FOCUS,
          status: PomodoroSessionStatus.COMPLETED,
          actualSeconds: 1500,
          taskId,
          interruptionReason: null,
        },
        {
          startedAt: new Date('2026-09-27T08:05:00Z'),
          sessionType: PomodoroSessionType.FOCUS,
          status: PomodoroSessionStatus.STOPPED,
          actualSeconds: 300,
          taskId,
          interruptionReason: 'phone',
        },
        {
          startedAt: new Date('2026-09-27T08:10:00Z'),
          sessionType: PomodoroSessionType.SHORT_BREAK,
          status: PomodoroSessionStatus.COMPLETED,
          actualSeconds: 300,
          taskId: null,
          interruptionReason: null,
        },
      ])
      .mockResolvedValueOnce([
        { startedAt: new Date('2026-09-27T08:00:00Z') },
        { startedAt: new Date('2026-09-26T08:00:00Z') },
      ]);
    prisma.pomodoroConfig.findUnique.mockResolvedValue(null);

    const stats = await service.dailyStats(userId, '2026-09-27');

    expect(stats).toEqual({
      date: '2026-09-27',
      totalFocusMinutes: 30,
      completedPomodoros: 1,
      completedTasks: 1,
      dailyGoalPomodoros: 8,
      currentStreak: 2,
      interruptionCounts: { phone: 1 },
    });
  });

  it('counts sessions by calendar time zone across a UTC date boundary', async () => {
    prisma.pomodoroSession.findMany
      .mockResolvedValueOnce([
        {
          startedAt: new Date('2026-09-26T18:00:00Z'),
          sessionType: PomodoroSessionType.FOCUS,
          status: PomodoroSessionStatus.COMPLETED,
          actualSeconds: 1500,
          taskId,
          interruptionReason: null,
        },
        {
          startedAt: new Date('2026-09-27T18:00:00Z'),
          sessionType: PomodoroSessionType.FOCUS,
          status: PomodoroSessionStatus.COMPLETED,
          actualSeconds: 1500,
          taskId,
          interruptionReason: null,
        },
      ])
      .mockResolvedValueOnce([{ startedAt: new Date('2026-09-26T18:00:00Z') }]);
    prisma.pomodoroConfig.findUnique.mockResolvedValue(null);

    const stats = await service.dailyStats(
      userId,
      '2026-09-27',
      'Asia/Ho_Chi_Minh',
    );

    expect(stats.completedPomodoros).toBe(1);
    expect(stats.totalFocusMinutes).toBe(25);
    expect(stats.currentStreak).toBe(1);
  });

  it('rejects an invalid time zone before querying sessions', async () => {
    await expect(
      service.dailyStats(userId, '2026-09-27', 'Invalid/Zone'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.pomodoroSession.findMany).not.toHaveBeenCalled();
  });

  it('summarizes every matching session independently of the current page', async () => {
    prisma.pomodoroSession.findMany.mockResolvedValue([
      {
        id: 'one',
        status: PomodoroSessionStatus.COMPLETED,
        plannedSeconds: 1500,
        actualSeconds: 1500,
      },
    ]);
    prisma.pomodoroSession.count
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(110);
    prisma.pomodoroSession.aggregate.mockResolvedValue({
      _sum: { actualSeconds: 6000 },
    });

    const result = await service.list(userId, {
      startAt: '2026-09-01T00:00:00Z',
      endAt: '2026-10-01T00:00:00Z',
      page: 2,
      limit: 1,
    });

    expect(result.summary).toEqual({
      focusSeconds: 6000,
      completedFocusSessions: 110,
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 1,
      totalItems: 120,
      totalPages: 120,
    });
    expect(prisma.pomodoroSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 1, take: 1 }),
    );
  });

  it('uses the client session ID to make retries idempotent', async () => {
    prisma.pomodoroSession.upsert.mockResolvedValue({
      id: 'existing',
      status: PomodoroSessionStatus.COMPLETED,
      plannedSeconds: 1500,
      actualSeconds: 1500,
    });
    const result = await service.create(userId, {
      clientSessionId: 'retry-1',
      sessionType: PomodoroSessionType.FOCUS,
      status: PomodoroSessionStatus.COMPLETED,
      startedAt: '2026-09-27T08:00:00Z',
      endedAt: '2026-09-27T08:25:00Z',
      plannedSeconds: 1500,
      actualSeconds: 1500,
    });
    expect(result).toEqual(
      expect.objectContaining({ id: 'existing', durationMinutes: 25 }),
    );
    expect(prisma.pomodoroSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_clientSessionId: { userId, clientSessionId: 'retry-1' },
        },
      }),
    );
    expect(prisma.pomodoroSession.create).not.toHaveBeenCalled();
  });

  it('does not count a short session as completed', async () => {
    await expect(
      service.create(userId, {
        sessionType: PomodoroSessionType.FOCUS,
        status: PomodoroSessionStatus.COMPLETED,
        startedAt: '2026-09-27T08:00:00Z',
        endedAt: '2026-09-27T08:10:00Z',
        plannedSeconds: 1500,
        actualSeconds: 600,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.pomodoroSession.create).not.toHaveBeenCalled();
  });

  it('refuses to attach a session to another user’s calendar event', async () => {
    prisma.calendarEvent.findUnique.mockResolvedValue({
      calendar: { ownerUserId: 'other-user' },
      sourceId: null,
      sourceType: 'USER',
    });
    await expect(
      service.create(userId, {
        eventId,
        sessionType: PomodoroSessionType.FOCUS,
        status: PomodoroSessionStatus.COMPLETED,
        startedAt: '2026-09-27T08:00:00Z',
        endedAt: '2026-09-27T08:25:00Z',
        plannedSeconds: 1500,
        actualSeconds: 1500,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.pomodoroSession.create).not.toHaveBeenCalled();
  });

  it('derives task and project snapshots from a linked task event', async () => {
    prisma.calendarEvent.findUnique.mockResolvedValue({
      title: 'Write chapter',
      sourceType: 'TASK',
      sourceId: taskId,
      calendar: {
        ownerUserId: userId,
        projectId: '44444444-4444-4444-4444-444444444444',
        name: 'Thesis',
      },
    });
    prisma.pomodoroSession.create.mockResolvedValue({
      id: 'saved',
      status: PomodoroSessionStatus.COMPLETED,
      plannedSeconds: 1500,
      actualSeconds: 1500,
    });

    await service.create(userId, {
      eventId,
      sessionType: PomodoroSessionType.FOCUS,
      status: PomodoroSessionStatus.COMPLETED,
      startedAt: '2026-09-27T08:00:00Z',
      endedAt: '2026-09-27T08:25:00Z',
      plannedSeconds: 1500,
      actualSeconds: 1500,
    });

    const createCalls = prisma.pomodoroSession.create.mock.calls as Array<
      [unknown]
    >;
    const createInput = createCalls[0]?.[0];
    expect(createInput).toMatchObject({
      data: {
        taskId,
        taskTitle: 'Write chapter',
        projectId: '44444444-4444-4444-4444-444444444444',
        projectName: 'Thesis',
      },
    });
  });

  it('rejects a timer update based on an outdated version', async () => {
    prisma.pomodoroTimerState.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing state', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.saveState(userId, {
        mode: PomodoroSessionType.FOCUS,
        status: 'PAUSED',
        remainingSeconds: 900,
        cycleCount: 1,
        notes: '',
        expectedVersion: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.pomodoroTimerState.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, version: 3 } }),
    );
  });

  it('persists idle timer mode, task, and notes', async () => {
    prisma.pomodoroTimerState.update.mockResolvedValue({ version: 4 });

    await service.saveState(userId, {
      mode: PomodoroSessionType.FOCUS,
      status: 'IDLE',
      remainingSeconds: 1500,
      cycleCount: 2,
      activeTask: { title: 'Write report' },
      notes: 'Chapter three',
      expectedVersion: 3,
    });

    const updateInput = (
      prisma.pomodoroTimerState.update.mock.calls as Array<[unknown]>
    )[0]?.[0];
    expect(updateInput).toMatchObject({
      where: { userId, version: 3 },
      data: {
        status: 'IDLE',
        remainingSeconds: 1500,
        cycleCount: 2,
        activeTask: { title: 'Write report' },
        notes: 'Chapter three',
      },
    });
  });

  it('clears a timer without resetting its version', async () => {
    prisma.pomodoroTimerState.update.mockResolvedValue({
      userId,
      status: 'IDLE',
      version: 5,
    });

    const result = await service.deleteState(userId, 4);

    expect(result).toEqual({ userId, status: 'IDLE', version: 5 });
    const updateCalls = prisma.pomodoroTimerState.update.mock.calls as Array<
      [unknown]
    >;
    const updateInput = updateCalls[0]?.[0];
    expect(updateInput).toMatchObject({
      where: { userId, version: 4 },
      data: { status: 'IDLE', version: { increment: 1 } },
    });
  });
});
