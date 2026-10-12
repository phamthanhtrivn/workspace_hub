jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('livekit-server-sdk', () => ({ TrackSource: {} }));

import { MeetingRecordingService } from './meeting-recording.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import type { S3Service } from '../../../infrastructure/s3/s3.service';
import type { MeetingPolicyService } from './meeting-policy.service';
import type { MeetingRealtimeService } from './meeting-realtime.service';
import type { Prisma } from '@prisma/client';

describe('recording access query and transaction boundaries', () => {
  const recording = {
    id: 'recording',
    meetingId: 'meeting',
    ownerId: 'owner',
    status: 'COMPLETED',
    stopRequestedAt: new Date(),
    permissions: [{ userId: 'viewer', canDownload: false }],
    meeting: { title: 'Meeting', joinToken: 'join' },
  };
  const setup = (recipientCount = 1) => {
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(
          Array.from({ length: recipientCount }, (_, i) => ({
            userId: `viewer-${i}`,
          })),
        ),
      $executeRaw: jest.fn().mockResolvedValue(recipientCount),
      meetingRecording: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(recording),
        update: jest.fn(),
      },
      userProfileSnapshot: {
        count: jest.fn().mockResolvedValue(recipientCount),
      },
      meetingRecordingPermission: {
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ userId: 'new-viewer' }]),
        upsert: jest
          .fn()
          .mockResolvedValue({ userId: 'viewer', canDownload: false }),
      },
      meetingRecordingJob: { upsert: jest.fn() },
    };
    const prisma = {
      meetingRecording: {
        findUnique: jest.fn().mockResolvedValue(recording),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([recording]),
      },
      userProfileSnapshot: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'viewer' }),
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 'viewer',
            fullName: 'Viewer',
            email: 'viewer@example.com',
          },
        ]),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          (fn: ((client: typeof tx) => unknown) | Promise<unknown>[]) =>
            typeof fn === 'function' ? fn(tx) : Promise.all(fn),
        ),
    };
    const realtime = { emitUserEvent: jest.fn() };
    const service = new MeetingRecordingService(
      prisma as unknown as PrismaService,
      {} as LiveKitService,
      {} as S3Service,
      {} as MeetingPolicyService,
      realtime as unknown as MeetingRealtimeService,
    );
    return { service, prisma, tx, realtime };
  };

  it('loads only the caller ACL for list and detail, preserving view-only capability', async () => {
    const { service, prisma } = setup();
    expect(
      (await service.detail('recording', 'viewer')).capabilities.canDownload,
    ).toBe(false);
    await service.list('viewer', {});
    for (const mock of [
      prisma.meetingRecording.findUnique,
      prisma.meetingRecording.findMany,
    ])
      expect(
        (mock.mock.calls as [Prisma.MeetingRecordingFindUniqueArgs][])[0][0]
          .include?.permissions,
      ).toEqual({
        where: { userId: 'viewer' },
        select: { userId: true, canDownload: true },
      });
  });
  it('loads all ACL only for owner administration and matches profiles by user ID', async () => {
    const { service, prisma } = setup();
    expect(await service.permissions('recording', 'owner')).toEqual([
      {
        userId: 'viewer',
        canDownload: false,
        profile: {
          userId: 'viewer',
          fullName: 'Viewer',
          email: 'viewer@example.com',
        },
      },
    ]);
    expect(
      (
        prisma.meetingRecording.findUnique.mock.calls as [
          Prisma.MeetingRecordingFindUniqueArgs,
        ][]
      )[0][0].include?.permissions,
    ).toEqual({ select: { userId: true, canDownload: true } });
  });
  it('skips profile lookup for an empty ACL', async () => {
    const { service, prisma } = setup();
    prisma.meetingRecording.findUnique.mockResolvedValue({
      ...recording,
      permissions: [],
    });
    expect(await service.permissions('recording', 'owner')).toEqual([]);
    expect(prisma.userProfileSnapshot.findMany).not.toHaveBeenCalled();
  });
  it.each([0, 1, 500, 501, 1001])(
    'shares to %i attendees with bounded writes and post-commit notification',
    async (count) => {
      const { service, tx, realtime } = setup(count);
      tx.$executeRaw.mockImplementation(() => {
        expect(realtime.emitUserEvent).not.toHaveBeenCalled();
        return Promise.resolve(1);
      });
      expect(
        await service.shareParticipants('recording', 'owner', false),
      ).toEqual({ sharedCount: count });
      expect(tx.$executeRaw).toHaveBeenCalledTimes(Math.ceil(count / 500));
      expect(tx.userProfileSnapshot.count).toHaveBeenCalledTimes(count ? 1 : 0);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
      expect(realtime.emitUserEvent).toHaveBeenCalledTimes(count);
      for (const [sql] of tx.$executeRaw.mock.calls as [
        { text: string; values: unknown[] },
      ][]) {
        expect(sql.text).toContain(
          'ON CONFLICT (recording_id, user_id) DO UPDATE',
        );
        expect(sql.values.length).toBeLessThanOrEqual(500 * 7);
        expect(sql.values).toContain(false);
      }
    },
  );
  it('does not partially share if any attendee account is unavailable', async () => {
    const { service, tx, realtime } = setup(2);
    tx.userProfileSnapshot.count.mockResolvedValue(1);
    await expect(
      service.shareParticipants('recording', 'owner', true),
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(realtime.emitUserEvent).not.toHaveBeenCalled();
  });
  it.each([
    { status: 'DELETED', code: 404 },
    { ownerId: 'other', code: 403 },
    { stopRequestedAt: null, stoppedAt: null, code: 409 },
  ])(
    'rechecks locked recording before bulk sharing: %j',
    async ({ code, ...change }) => {
      const { service, tx, realtime } = setup();
      tx.meetingRecording.findUniqueOrThrow.mockResolvedValue({
        ...recording,
        ...change,
      });
      await expect(
        service.shareParticipants('recording', 'owner', true),
      ).rejects.toMatchObject({ status: code });
      expect(tx.$executeRaw).not.toHaveBeenCalled();
      expect(realtime.emitUserEvent).not.toHaveBeenCalled();
    },
  );
  it('serializes revoke with shares and deletion through a recording lock', async () => {
    const { service, tx, realtime } = setup();
    await service.revoke('recording', 'owner', 'viewer');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.meetingRecordingPermission.deleteMany).toHaveBeenCalledWith({
      where: { recordingId: 'recording', userId: 'viewer' },
    });
    expect(realtime.emitUserEvent).toHaveBeenCalledTimes(1);
  });
  it('shares to a single account after checking ownership under the same recording lock', async () => {
    const { service, tx, realtime } = setup();
    expect(await service.share('recording', 'owner', 'viewer', false)).toEqual({
      userId: 'viewer',
      canDownload: false,
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.meetingRecordingPermission.upsert).toHaveBeenCalledWith({
      where: {
        recordingId_userId: { recordingId: 'recording', userId: 'viewer' },
      },
      create: {
        recordingId: 'recording',
        userId: 'viewer',
        grantedBy: 'owner',
        canDownload: false,
      },
      update: { grantedBy: 'owner', canDownload: false },
    });
    expect(realtime.emitUserEvent).toHaveBeenCalledTimes(1);
  });
  it.each([
    { status: 'DELETED', code: 404 },
    { ownerId: 'other', code: 403 },
  ])(
    'does not grant single-account access if the locked recording changed: %j',
    async ({ code, ...change }) => {
      const { service, tx, realtime } = setup();
      tx.meetingRecording.findUniqueOrThrow.mockResolvedValue({
        ...recording,
        ...change,
      });
      await expect(
        service.share('recording', 'owner', 'viewer', true),
      ).rejects.toMatchObject({ status: code });
      expect(tx.meetingRecordingPermission.upsert).not.toHaveBeenCalled();
      expect(realtime.emitUserEvent).not.toHaveBeenCalled();
    },
  );
  it('notifies ACL recipients found under the delete lock, including a recent share', async () => {
    const { service, tx, realtime } = setup();
    await service.delete('recording', 'owner');
    expect(tx.meetingRecordingPermission.findMany).toHaveBeenCalledWith({
      where: { recordingId: 'recording' },
      select: { userId: true },
    });
    expect(
      realtime.emitUserEvent.mock.calls.map(([id]: [string]) => id),
    ).toEqual(['owner', 'new-viewer']);
  });
});
