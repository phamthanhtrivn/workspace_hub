import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { ListMeetingHistoryDto } from '../dto/list-meeting-history.dto';
import { UpdateMeetingHistoryVisibilityDto } from '../dto/update-meeting-history-visibility.dto';
import { MeetingHistoryVisibility } from '../types/meeting.enums';
import { MeetingHistoryPreferenceService } from './meeting-history-preference.service';
import { MeetingHistoryService } from './meeting-history.service';
import { MeetingPresenterService } from './meeting-presenter.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

function fixture(status: MeetingStatus = MeetingStatus.ENDED, joined = true) {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    meeting: {
      findUnique: jest.fn().mockResolvedValue({
        status,
        participants: joined ? [{ id: 'participant' }] : [],
      }),
    },
    meetingHistoryPreference: { upsert: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const realtime = { emitUserEvent: jest.fn() };
  const service = new MeetingHistoryPreferenceService(
    prisma as unknown as PrismaService,
    realtime as unknown as MeetingRealtimeService,
  );
  return { service, prisma, tx, realtime };
}

describe('personal meeting history visibility', () => {
  it.each([MeetingStatus.ENDED, MeetingStatus.CANCELLED])(
    'hides a joined %s meeting for the authenticated user only',
    async (status) => {
      const { service, tx, realtime } = fixture(status);
      await expect(
        service.updateVisibility('meeting', 'viewer', true),
      ).resolves.toEqual({ meetingId: 'meeting', hidden: true });
      expect(tx.meeting.findUnique).toHaveBeenCalledWith({
        where: { id: 'meeting' },
        select: {
          status: true,
          participants: {
            where: { userId: 'viewer', joinedAt: { not: null } },
            select: { id: true },
            take: 1,
          },
        },
      });
      expect(tx.meetingHistoryPreference.upsert).toHaveBeenCalledWith({
        where: { meetingId_userId: { meetingId: 'meeting', userId: 'viewer' } },
        create: {
          meetingId: 'meeting',
          userId: 'viewer',
          hiddenAt: expect.any(Date) as Date,
          hiddenBatchId: null,
        },
        update: { hiddenAt: expect.any(Date) as Date, hiddenBatchId: null },
      });
      expect(realtime.emitUserEvent).toHaveBeenCalledWith(
        'viewer',
        MeetingEvent.HISTORY_VISIBILITY_UPDATED,
        { meetingId: 'meeting', hidden: true },
      );
    },
  );

  it('restores idempotently without deleting meeting content or participant history', async () => {
    const { service, tx } = fixture();
    await service.updateVisibility('meeting', 'viewer', false);
    await service.updateVisibility('meeting', 'viewer', false);
    expect(tx.meetingHistoryPreference.upsert).toHaveBeenLastCalledWith({
      where: { meetingId_userId: { meetingId: 'meeting', userId: 'viewer' } },
      create: {
        meetingId: 'meeting',
        userId: 'viewer',
        hiddenAt: null,
        hiddenBatchId: null,
      },
      update: { hiddenAt: null, hiddenBatchId: null },
    });
  });

  it.each([MeetingStatus.LIVE, MeetingStatus.SCHEDULED])(
    'rejects hiding %s meetings',
    async (status) => {
      const { service, tx, realtime } = fixture(status);
      await expect(
        service.updateVisibility('meeting', 'viewer', true),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.meetingHistoryPreference.upsert).not.toHaveBeenCalled();
      expect(realtime.emitUserEvent).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'rejects outsiders for hidden=%s before writing or emitting events',
    async (hidden) => {
      const { service, tx, realtime } = fixture(MeetingStatus.ENDED, false);
      await expect(
        service.updateVisibility('meeting', 'outsider', hidden),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.meetingHistoryPreference.upsert).not.toHaveBeenCalled();
      expect(realtime.emitUserEvent).not.toHaveBeenCalled();
    },
  );

  it('rejects missing identity and distinguishes a missing meeting', async () => {
    const { service, prisma, tx } = fixture();
    await expect(
      service.updateVisibility('meeting', '', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    tx.meeting.findUnique.mockResolvedValue(null);
    await expect(
      service.updateVisibility('missing', 'viewer', true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not emit a successful change when persistence fails', async () => {
    const { service, tx, realtime } = fixture();
    tx.meetingHistoryPreference.upsert.mockRejectedValue(
      new Error('Database unavailable'),
    );
    await expect(
      service.updateVisibility('meeting', 'viewer', true),
    ).rejects.toThrow('Database unavailable');
    expect(realtime.emitUserEvent).not.toHaveBeenCalled();
  });
});

describe('meeting history queries and input contracts', () => {
  it.each([
    undefined,
    MeetingHistoryVisibility.VISIBLE,
    MeetingHistoryVisibility.HIDDEN,
  ])(
    'filters %s history before counting and paginating',
    async (visibility) => {
      const prisma = {
        meeting: {
          count: jest.fn().mockResolvedValue(13),
          findMany: jest.fn().mockResolvedValue([]),
        },
        $transaction: jest.fn((queries: Promise<unknown>[]) =>
          Promise.all(queries),
        ),
      };
      const service = new MeetingHistoryService(
        prisma as unknown as PrismaService,
        {} as UserProfileSnapshotService,
        {} as MeetingPresenterService,
      );
      const result = await service.listMeetingHistory({
        userId: 'viewer',
        query: { page: 2, limit: 12, visibility },
      });
      const where = {
        participants: { some: { userId: 'viewer', joinedAt: { not: null } } },
        historyPreferences: {
          [visibility === MeetingHistoryVisibility.HIDDEN ? 'some' : 'none']: {
            userId: 'viewer',
            hiddenAt: { not: null },
          },
        },
      };
      expect(prisma.meeting.count).toHaveBeenCalledWith({ where });
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 12, take: 12 }),
      );
      expect(result).toMatchObject({ page: 2, total: 13, totalPages: 2 });
    },
  );

  it('requires a boolean visibility mutation and validates history filters', async () => {
    for (const hidden of [undefined, null, 'true', 1]) {
      expect(
        await validate(
          plainToInstance(UpdateMeetingHistoryVisibilityDto, { hidden }),
        ),
      ).not.toHaveLength(0);
    }
    expect(
      await validate(
        plainToInstance(UpdateMeetingHistoryVisibilityDto, { hidden: false }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ListMeetingHistoryDto, { visibility: 'all' }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ListMeetingHistoryDto, {
          page: '2',
          visibility: 'hidden',
        }),
      ),
    ).toHaveLength(0);
  });
});
