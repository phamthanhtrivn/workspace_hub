/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  it('creates a personal default without hiding future project calendars', async () => {
    const personalCalendar = {
      id: '22222222-2222-2222-2222-222222222222',
      ownerUserId: userId,
      projectId: null,
      name: 'Personal',
      isDefault: true,
    };
    const projectCalendar = {
      ...personalCalendar,
      id: '33333333-3333-3333-3333-333333333333',
      projectId: '44444444-4444-4444-4444-444444444444',
      name: 'Project tasks',
      isDefault: false,
    };
    const tx = {
      $executeRaw: jest.fn(),
      calendar: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(personalCalendar),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      calendar: {
        findMany: jest
          .fn()
          .mockResolvedValue([personalCalendar, projectCalendar]),
      },
    };
    const service = new CalendarService(prisma as any);

    const result = await service.getUserCalendars(userId);

    expect(tx.calendar.findFirst).toHaveBeenNthCalledWith(1, {
      where: { ownerUserId: userId, projectId: null, isDefault: true },
    });
    expect(tx.calendar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerUserId: userId,
        projectId: null,
        isDefault: true,
      }),
    });
    expect(prisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerUserId: userId },
      }),
    );
    expect(result).toEqual([personalCalendar, projectCalendar]);
  });
});
