import { WorkAssistantService } from './work-assistant.service';
type EventQuery = {
  select: Record<string, boolean>;
  where: Record<string, unknown>;
};
import type { PrismaService } from '../../prisma/prisma.service';
describe('work assistant private calendar projection', () => {
  it('exports only busy intervals, exact personal task counts, and the asking user focus data', async () => {
    const userId = '10000000-0000-4000-8000-000000000001';
    const now = new Date(),
      end = new Date(now.getTime() + 3600000);
    const db = {
      calendar: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ timeZone: 'Asia/Ho_Chi_Minh' }),
      },
      recurrenceSeries: { count: jest.fn().mockResolvedValue(0) },
      calendarEvent: {
        findMany: jest.fn((query: EventQuery) => {
          const { select } = query;
          if (select.startAt && !select.id)
            return [{ startAt: now, endAt: end }];
          if (select.completedAt) return [{ endAt: end, completedAt: now }];
          return [
            {
              id: '10000000-0000-4000-8000-000000000003',
              title: 'Personal task',
              description: 'Task detail',
              startAt: now,
              endAt: end,
              allDay: false,
            },
          ];
        }),
        aggregate: jest.fn().mockResolvedValue({ _count: { _all: 150 } }),
        count: jest.fn().mockResolvedValue(2),
      },
      pomodoroSession: {
        aggregate: jest.fn((query: { where: { userId: string } }) =>
          Promise.resolve({
            _sum: { actualSeconds: query.where.userId === userId ? 2500 : 0 },
            _count: { _all: 2 },
          }),
        ),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    const context = await new WorkAssistantService(
      db as unknown as PrismaService,
    ).context({
      userId,
      from: new Date(now.getTime() - 6 * 86400000).toISOString(),
      to: end.toISOString(),
      windowStart: now.toISOString(),
      windowEnd: new Date(now.getTime() + 7 * 86400000).toISOString(),
      todayEnd: end.toISOString(),
    });
    expect(context.busy).toEqual([{ startAt: now, endAt: end }]);
    expect(Object.keys(context.busy[0]).sort()).toEqual(['endAt', 'startAt']);
    expect(db.calendarEvent.findMany.mock.calls[0][0].select).toEqual({
      startAt: true,
      endAt: true,
    });
    expect(context.metrics.open).toBe(150);
    expect(context.metrics.onTimeRate).toBe(1);
    expect(context.focus.seconds).toBe(2500);
    expect(db.pomodoroSession.aggregate.mock.calls[0][0].where.userId).toBe(
      userId,
    );
    const tasksWhere = db.calendarEvent.findMany.mock.calls[1][0].where;
    expect(tasksWhere.calendar).toEqual({
      projectId: null,
      ownerUserId: userId,
    });
    expect(tasksWhere.OR).toContainEqual({
      sourceType: 'TASK',
      sourceId: null,
    });
  });
});
