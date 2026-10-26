import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import {
  BulkUpdateMeetingHistoryVisibilityDto,
  UndoMeetingHistoryBatchDto,
} from '../dto/bulk-update-meeting-history-visibility.dto';
import { HISTORY_BULK_CHUNK_SIZE } from '../types/meeting.constants';
import { MeetingHistoryBulkScope } from '../types/meeting.enums';
import { MeetingHistoryBulkService } from './meeting-history-bulk.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

function fixture() {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    meeting: { findMany: jest.fn() },
    meetingHistoryPreference: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const realtime = { emitUserEvent: jest.fn() };
  const service = new MeetingHistoryBulkService(
    prisma as unknown as PrismaService,
    realtime as unknown as MeetingRealtimeService,
  );
  return { service, tx, prisma, realtime };
}

describe('bulk meeting history visibility', () => {
  it('hides all eligible meetings across pages and gives the changed rows one batch token', async () => {
    const { service, tx, realtime } = fixture();
    const targets = Array.from(
      { length: HISTORY_BULK_CHUNK_SIZE + 1 },
      (_, index) => ({ id: `meeting-${index}` }),
    );
    tx.meeting.findMany.mockResolvedValue(targets);
    const result = await service.updateVisibility('viewer', {
      scope: MeetingHistoryBulkScope.ALL,
      hidden: true,
      expectedCount: targets.length,
    });
    expect(result).toMatchObject({
      affectedCount: targets.length,
      hidden: true,
    });
    expect(result.batchId).toEqual(expect.any(String));
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.meeting.findMany).toHaveBeenCalledWith({
      where: {
        participants: { some: { userId: 'viewer', joinedAt: { not: null } } },
        status: { in: [MeetingStatus.ENDED, MeetingStatus.CANCELLED] },
        historyPreferences: {
          none: { userId: 'viewer', hiddenAt: { not: null } },
        },
      },
      select: { id: true },
    });
    expect(tx.meetingHistoryPreference.createMany).toHaveBeenCalledTimes(2);
    const [firstChunk] = tx.meetingHistoryPreference.createMany.mock
      .calls[0] as [
      {
        data: { userId: string; hiddenBatchId: string }[];
        skipDuplicates: boolean;
      },
    ];
    expect(firstChunk.data).toHaveLength(HISTORY_BULK_CHUNK_SIZE);
    expect(firstChunk.skipDuplicates).toBe(true);
    expect(
      firstChunk.data.every(
        (row) =>
          row.userId === 'viewer' && row.hiddenBatchId === result.batchId,
      ),
    ).toBe(true);
    expect(realtime.emitUserEvent).toHaveBeenCalledWith(
      'viewer',
      MeetingEvent.HISTORY_VISIBILITY_UPDATED,
      result,
    );
  });

  it('restores all hidden meetings without creating rows or touching another user', async () => {
    const { service, tx } = fixture();
    tx.meeting.findMany.mockResolvedValue([{ id: 'one' }, { id: 'two' }]);
    await expect(
      service.updateVisibility('viewer', {
        scope: MeetingHistoryBulkScope.ALL,
        hidden: false,
        expectedCount: 2,
      }),
    ).resolves.toEqual({ affectedCount: 2, hidden: false, batchId: null });
    expect(tx.meetingHistoryPreference.createMany).not.toHaveBeenCalled();
    expect(tx.meetingHistoryPreference.updateMany).toHaveBeenCalledWith({
      where: { userId: 'viewer', meetingId: { in: ['one', 'two'] } },
      data: { hiddenAt: null, hiddenBatchId: null },
    });
  });

  it('rejects a mixed selection containing inaccessible meetings before any writes', async () => {
    const { service, tx, realtime } = fixture();
    tx.meeting.findMany.mockResolvedValue([
      { id: 'mine', status: MeetingStatus.ENDED },
    ]);
    await expect(
      service.updateVisibility('viewer', {
        scope: MeetingHistoryBulkScope.SELECTED,
        hidden: true,
        meetingIds: ['mine', 'outsider'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.meetingHistoryPreference.createMany).not.toHaveBeenCalled();
    expect(tx.meetingHistoryPreference.updateMany).not.toHaveBeenCalled();
    expect(realtime.emitUserEvent).not.toHaveBeenCalled();
  });

  it('rejects a selected live meeting and never partly hides the rest', async () => {
    const { service, tx } = fixture();
    tx.meeting.findMany.mockResolvedValue([
      { id: 'live', status: MeetingStatus.LIVE },
    ]);
    await expect(
      service.updateVisibility('viewer', {
        scope: MeetingHistoryBulkScope.SELECTED,
        hidden: true,
        meetingIds: ['live'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.meetingHistoryPreference.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a stale confirmation count and emits no successful mutation', async () => {
    const { service, tx, realtime } = fixture();
    tx.meeting.findMany.mockResolvedValue([
      { id: 'one' },
      { id: 'new-meeting' },
    ]);
    await expect(
      service.updateVisibility('viewer', {
        scope: MeetingHistoryBulkScope.ALL,
        hidden: true,
        expectedCount: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.meetingHistoryPreference.createMany).not.toHaveBeenCalled();
    expect(realtime.emitUserEvent).not.toHaveBeenCalled();
  });

  it('limits a selected operation to its explicit IDs', async () => {
    const { service, tx } = fixture();
    tx.meeting.findMany
      .mockResolvedValueOnce([{ id: 'one', status: MeetingStatus.ENDED }])
      .mockResolvedValueOnce([{ id: 'one' }]);
    await service.updateVisibility('viewer', {
      scope: MeetingHistoryBulkScope.SELECTED,
      hidden: true,
      meetingIds: ['one'],
      expectedCount: 1,
    });
    const [query] = tx.meeting.findMany.mock.calls[1] as [
      {
        where: { id: { in: string[] } };
      },
    ];
    expect(query.where.id.in).toEqual(['one']);
  });

  it('Undo only restores rows still tagged with the users original batch', async () => {
    const { service, tx } = fixture();
    await expect(service.undoBatch('viewer', 'batch')).resolves.toEqual({
      affectedCount: 1,
      hidden: false,
      batchId: null,
    });
    expect(tx.meetingHistoryPreference.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'viewer',
        hiddenBatchId: 'batch',
        hiddenAt: { not: null },
        meeting: {
          participants: { some: { userId: 'viewer', joinedAt: { not: null } } },
        },
      },
      data: { hiddenAt: null, hiddenBatchId: null },
    });
  });

  it('handles an empty target set without creating an undo token', async () => {
    const { service, tx } = fixture();
    tx.meeting.findMany.mockResolvedValue([]);
    await expect(
      service.updateVisibility('viewer', {
        scope: MeetingHistoryBulkScope.ALL,
        hidden: true,
        expectedCount: 0,
      }),
    ).resolves.toEqual({ affectedCount: 0, hidden: true, batchId: null });
    expect(tx.meetingHistoryPreference.createMany).not.toHaveBeenCalled();
  });

  it('does not emit success if a write fails inside the atomic transaction', async () => {
    const { service, tx, realtime } = fixture();
    tx.meeting.findMany.mockResolvedValue([{ id: 'one' }]);
    tx.meetingHistoryPreference.updateMany.mockRejectedValue(
      new Error('rollback'),
    );
    await expect(
      service.updateVisibility('viewer', {
        scope: MeetingHistoryBulkScope.ALL,
        hidden: true,
        expectedCount: 1,
      }),
    ).rejects.toThrow('rollback');
    expect(realtime.emitUserEvent).not.toHaveBeenCalled();
  });

  it('rejects missing identity and inconsistent scopes without starting a transaction', async () => {
    const { service, prisma } = fixture();
    for (const [userId, dto] of [
      [
        '',
        { scope: MeetingHistoryBulkScope.ALL, hidden: true, expectedCount: 1 },
      ],
      ['viewer', { scope: MeetingHistoryBulkScope.ALL, hidden: true }],
      [
        'viewer',
        {
          scope: MeetingHistoryBulkScope.ALL,
          hidden: true,
          meetingIds: ['one'],
          expectedCount: 1,
        },
      ],
      ['viewer', { scope: MeetingHistoryBulkScope.SELECTED, hidden: true }],
    ] as const) {
      await expect(
        service.updateVisibility(
          userId,
          dto as BulkUpdateMeetingHistoryVisibilityDto,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('validates UUID selections, unique IDs, counts, scopes and undo tokens at the boundary', async () => {
    const id = randomUUID();
    const base = {
      scope: MeetingHistoryBulkScope.SELECTED,
      hidden: true,
      meetingIds: [id],
      expectedCount: 1,
    };
    expect(
      await validate(
        plainToInstance(BulkUpdateMeetingHistoryVisibilityDto, base),
      ),
    ).toHaveLength(0);
    for (const patch of [
      { meetingIds: undefined },
      { meetingIds: [] },
      { meetingIds: [id, id] },
      { meetingIds: ['bad'] },
      { expectedCount: -1 },
      { scope: 'bad' },
      { hidden: 'true' },
    ]) {
      expect(
        await validate(
          plainToInstance(BulkUpdateMeetingHistoryVisibilityDto, {
            ...base,
            ...patch,
          }),
        ),
      ).not.toHaveLength(0);
    }
    expect(
      await validate(
        plainToInstance(UndoMeetingHistoryBatchDto, { batchId: 'bad' }),
      ),
    ).not.toHaveLength(0);
  });
});
