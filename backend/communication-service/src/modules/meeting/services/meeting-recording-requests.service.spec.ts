import type { Meeting, MeetingParticipant } from '@prisma/client';
import { MeetingRecordingRequestsService } from './meeting-recording-requests.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

describe('recording permission requests', () => {
  const now = new Date('2026-10-09T10:00:00Z');
  const meeting = { id: 'meeting', hostId: 'host', status: 'LIVE' } as Meeting;
  const member = {
    id: 'participant',
    meetingId: meeting.id,
    userId: 'member',
    status: 'JOINED',
    role: 'PARTICIPANT',
    canRecord: false,
    joinedAt: new Date(now.getTime() - 600_000),
    recordingRequestId: 'request',
    recordingRequestedAt: now,
    recordingRequestState: 'PENDING',
  } as MeetingParticipant;
  const host = {
    ...member,
    id: 'host-participant',
    userId: 'host',
    role: 'HOST',
    recordingRequestId: null,
  } as MeetingParticipant;
  const tx = {
    $queryRaw: jest.fn(),
    meeting: { findUniqueOrThrow: jest.fn() },
    meetingParticipant: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    userProfileSnapshot: { findMany: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn() };
  const policy = { assertJoinedMeetingParticipant: jest.fn() };
  const realtime = { emitMeetingEvent: jest.fn() };
  let service: MeetingRecordingRequestsService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.resetAllMocks();
    tx.meeting.findUniqueOrThrow.mockResolvedValue(meeting);
    tx.meetingParticipant.findUniqueOrThrow.mockImplementation(
      (input: { where: { meetingId_userId: { userId: string } } }) =>
        Promise.resolve(
          input.where.meetingId_userId.userId === 'host' ? host : member,
        ),
    );
    tx.meetingParticipant.findUnique.mockResolvedValue(member);
    tx.meetingParticipant.findMany.mockResolvedValue([member]);
    tx.meetingParticipant.update.mockImplementation(
      (input: { data: Partial<MeetingParticipant> }) =>
        Promise.resolve({ ...member, ...input.data }),
    );
    tx.userProfileSnapshot.findMany.mockResolvedValue([
      {
        userId: 'member',
        fullName: 'Member name',
        email: 'member@example.test',
      },
    ]);
    prisma.$transaction.mockImplementation(
      async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    );
    policy.assertJoinedMeetingParticipant.mockResolvedValue({
      meeting,
      participant: member,
    });
    service = new MeetingRecordingRequestsService(
      prisma as unknown as PrismaService,
      policy as unknown as MeetingPolicyService,
      realtime as unknown as MeetingRealtimeService,
    );
  });
  afterEach(() => jest.useRealTimers());

  it('persists a new UUID request without granting permission', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockResolvedValue({
      ...member,
      recordingRequestId: null,
      recordingRequestedAt: null,
      recordingRequestState: null,
    });
    const result = await service.request('token', 'member');
    expect(result).toMatchObject({
      status: 'PENDING',
      expiresAt: '2026-10-09T10:02:00.000Z',
    });
    expect(result!.id).toMatch(/^[0-9a-f-]{36}$/);
    const [saved] = tx.meetingParticipant.update.mock.calls[0] as [
      { data: Partial<MeetingParticipant> },
    ];
    expect(saved.data.canRecord).toBeUndefined();
    expect(realtime.emitMeetingEvent).toHaveBeenCalledTimes(1);
  });
  it('deduplicates repeated requests without sending another notification', async () => {
    expect(await service.request('token', 'member')).toMatchObject({
      id: 'request',
    });
    expect(tx.meetingParticipant.update).not.toHaveBeenCalled();
    expect(realtime.emitMeetingEvent).not.toHaveBeenCalled();
  });
  it('rate limits a new request after rejection', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockResolvedValue({
      ...member,
      recordingRequestState: 'REJECTED',
    });
    await expect(service.request('token', 'member')).rejects.toMatchObject({
      status: 429,
    });
  });
  it('allows a fresh request after the cooldown and replaces the old ID', async () => {
    jest.setSystemTime(now.getTime() + 60_001);
    tx.meetingParticipant.findUniqueOrThrow.mockResolvedValue({
      ...member,
      recordingRequestState: 'REJECTED',
    });
    expect((await service.request('token', 'member'))!.id).not.toBe('request');
  });
  it.each(['LEFT', 'REMOVED', 'REQUESTED'])(
    'rejects a %s requester after acquiring locks',
    async (status) => {
      tx.meetingParticipant.findUniqueOrThrow.mockResolvedValue({
        ...member,
        status,
      });
      await expect(service.request('token', 'member')).rejects.toMatchObject({
        status: 403,
      });
    },
  );
  it('does not request permission that is already granted', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockResolvedValue({
      ...member,
      canRecord: true,
    });
    await expect(service.request('token', 'member')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('only reveals pending requester names to the host', async () => {
    expect(await service.snapshot(meeting, member)).toMatchObject({
      recordingRequests: [],
      recordingRequest: { status: 'PENDING' },
      canRequestRecording: false,
    });
    expect(tx.userProfileSnapshot.findMany).not.toHaveBeenCalled();
    expect(await service.snapshot(meeting, host)).toMatchObject({
      recordingRequests: [{ userId: 'member', displayName: 'Member name' }],
    });
  });
  it('expires pending requests without allowing a late grant', async () => {
    jest.setSystemTime(now.getTime() + 120_001);
    expect(await service.snapshot(meeting, member)).toMatchObject({
      recordingRequest: { status: 'EXPIRED' },
      canRequestRecording: true,
    });
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.meetingParticipant.update).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'atomically answers a request with approve=%s',
    async (approve) => {
      expect(
        await service.decide('token', 'host', 'request', approve),
      ).toMatchObject({ status: approve ? 'APPROVED' : 'REJECTED' });
      expect(tx.meetingParticipant.update).toHaveBeenCalledWith({
        where: { id: member.id },
        data: {
          recordingRequestState: approve ? 'APPROVED' : 'REJECTED',
          canRecord: approve,
          recordGrantedBy: approve ? 'host' : null,
        },
      });
      expect(realtime.emitMeetingEvent).toHaveBeenCalledTimes(2);
    },
  );
  it('replays the same decision without duplicate permission changes', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockImplementation(
      (input: { where: { meetingId_userId: { userId: string } } }) =>
        Promise.resolve(
          input.where.meetingId_userId.userId === 'host'
            ? host
            : { ...member, recordingRequestState: 'APPROVED', canRecord: true },
        ),
    );
    expect(
      await service.decide('token', 'host', 'request', true),
    ).toMatchObject({ status: 'APPROVED' });
    expect(tx.meetingParticipant.update).not.toHaveBeenCalled();
  });
  it('rejects an opposite decision after another browser answered', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockImplementation(
      (input: { where: { meetingId_userId: { userId: string } } }) =>
        Promise.resolve(
          input.where.meetingId_userId.userId === 'host'
            ? host
            : { ...member, recordingRequestState: 'REJECTED' },
        ),
    );
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rejects the former host after a transfer', async () => {
    tx.meeting.findUniqueOrThrow.mockResolvedValue({
      ...meeting,
      hostId: 'new-host',
    });
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('does not let a co-host answer recording requests', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockResolvedValue({
      ...host,
      role: 'COHOST',
    });
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects request IDs from another meeting', async () => {
    tx.meetingParticipant.findUnique.mockResolvedValue({
      ...member,
      meetingId: 'other',
    });
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 404 });
  });
  it.each(['LEFT', 'REMOVED'])(
    'does not grant a %s participant',
    async (status) => {
      tx.meetingParticipant.findUniqueOrThrow.mockImplementation(
        (input: { where: { meetingId_userId: { userId: string } } }) =>
          Promise.resolve(
            input.where.meetingId_userId.userId === 'host'
              ? host
              : { ...member, status },
          ),
      );
      await expect(
        service.decide('token', 'host', 'request', true),
      ).rejects.toMatchObject({ status: 409 });
    },
  );
  it('does not accept a request from an earlier join session', async () => {
    tx.meetingParticipant.findUniqueOrThrow.mockImplementation(
      (input: { where: { meetingId_userId: { userId: string } } }) =>
        Promise.resolve(
          input.where.meetingId_userId.userId === 'host'
            ? host
            : { ...member, joinedAt: new Date(now.getTime() + 1) },
        ),
    );
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('ignores old request IDs after a new request replaces them', async () => {
    tx.meetingParticipant.findUnique.mockResolvedValue(null);
    await expect(
      service.decide('token', 'host', 'old-request', true),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('rejects decisions once the meeting has ended', async () => {
    tx.meeting.findUniqueOrThrow.mockResolvedValue({
      ...meeting,
      status: 'ENDED',
    });
    await expect(
      service.decide('token', 'host', 'request', true),
    ).rejects.toMatchObject({ status: 403 });
  });
});
