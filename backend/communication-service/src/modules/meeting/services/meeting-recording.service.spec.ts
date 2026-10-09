jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('livekit-server-sdk', () => ({
  TrackSource: {
    CAMERA: 1,
    MICROPHONE: 2,
    SCREEN_SHARE: 3,
    SCREEN_SHARE_AUDIO: 4,
  },
}));

import { HttpException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MeetingRecordingService } from './meeting-recording.service';
import { recordingCapabilities } from '../utils/meeting-recording.utils';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import type { S3Service } from '../../../infrastructure/s3/s3.service';
import type { MeetingPolicyService } from './meeting-policy.service';
import type { MeetingRealtimeService } from './meeting-realtime.service';

describe('recording authorization', () => {
  it.each(['HOST', 'COHOST'] as const)(
    'allows joined %s to start and stop any recording',
    (role) => {
      const participant = { role, status: 'JOINED' as const, canRecord: false };
      expect(recordingCapabilities(participant).canStart).toBe(true);
      expect(
        recordingCapabilities(
          participant,
          { startedBy: 'another-user', stopRequestedAt: null },
          'me',
        ).canStop,
      ).toBe(true);
    },
  );
  it.each(['LEFT', 'REMOVED', 'REQUESTED', 'INVITED'] as const)(
    'denies %s even with host role and a grant',
    (status) => {
      expect(
        recordingCapabilities({ role: 'HOST', status, canRecord: true }),
      ).toEqual({ canStart: false, canStop: false, canGrantRecord: false });
    },
  );
  it('requires a participant grant and restricts stop to the same starter', () => {
    const participant = {
      role: 'PARTICIPANT' as const,
      status: 'JOINED' as const,
      canRecord: true,
    };
    expect(
      recordingCapabilities({ ...participant, canRecord: false }).canStart,
    ).toBe(false);
    expect(
      recordingCapabilities(
        participant,
        { startedBy: 'other', stopRequestedAt: null },
        'me',
      ).canStop,
    ).toBe(false);
    expect(
      recordingCapabilities(
        participant,
        { startedBy: 'me', stopRequestedAt: null },
        'me',
      ).canStop,
    ).toBe(true);
    expect(
      recordingCapabilities(
        participant,
        { startedBy: 'me', stopRequestedAt: new Date() },
        'me',
      ).canStop,
    ).toBe(false);
    expect(recordingCapabilities(participant).canGrantRecord).toBe(false);
  });
});

describe('MeetingRecordingService', () => {
  const recording = {
    id: 'recording',
    meetingId: 'meeting',
    ownerId: 'owner',
    startedBy: 'cohost',
    status: 'COMPLETED',
    sizeBytes: 5_000_000_000n,
    s3Key: 'recordings/meeting/recording.mp4',
    title: 'Recording',
    permissions: [{ userId: 'viewer', canDownload: false }],
    meeting: { title: 'Meeting', joinToken: 'join' },
  };
  let service: MeetingRecordingService;
  let prisma: {
    meetingRecording: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
    meetingRecordingJob: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let s3: { generateRecordingUrl: jest.Mock };
  let policy: { assertJoinedMeetingParticipant: jest.Mock };

  beforeEach(() => {
    prisma = {
      meetingRecording: {
        findUnique: jest.fn().mockResolvedValue(recording),
        findUniqueOrThrow: jest.fn().mockResolvedValue(recording),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      meetingRecordingJob: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    s3 = {
      generateRecordingUrl: jest
        .fn()
        .mockResolvedValue({ url: 'signed-url', expiresAt: 'expires' }),
    };
    policy = {
      assertJoinedMeetingParticipant: jest.fn().mockResolvedValue({
        meeting: { id: 'meeting' },
        participant: { role: 'COHOST', status: 'JOINED', canRecord: false },
      }),
    };
    service = new MeetingRecordingService(
      prisma as unknown as PrismaService,
      { isRecordingConfigured: () => true } as unknown as LiveKitService,
      s3 as unknown as S3Service,
      policy as unknown as MeetingPolicyService,
      {} as MeetingRealtimeService,
    );
  });

  it('returns a private 404 to strangers and does not leak the storage key', async () => {
    await expect(service.detail('recording', 'stranger')).rejects.toMatchObject(
      { status: 404 },
    );
    const result = await service.detail('recording', 'viewer');
    expect(result).not.toHaveProperty('s3Key');
    expect(result.sizeBytes).toBe('5000000000');
  });
  it('does not grant library access merely because someone started recording', async () => {
    await expect(service.detail('recording', 'cohost')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('allows playback after the meeting without requiring a joined participant', async () => {
    await service.url('recording', 'viewer', false);
    expect(policy.assertJoinedMeetingParticipant).not.toHaveBeenCalled();
    expect(s3.generateRecordingUrl).toHaveBeenCalledWith(
      recording.s3Key,
      false,
    );
  });
  it('blocks download by a view-only account', async () => {
    await expect(
      service.url('recording', 'viewer', true),
    ).rejects.toMatchObject({ status: 403 });
    expect(s3.generateRecordingUrl).not.toHaveBeenCalled();
  });
  it('allows the owner to download', async () => {
    await service.url('recording', 'owner', true);
    expect(s3.generateRecordingUrl).toHaveBeenCalledWith(recording.s3Key, true);
  });
  it('denies playback before processing completes and after deletion', async () => {
    prisma.meetingRecording.findUnique.mockResolvedValueOnce({
      ...recording,
      status: 'PROCESSING',
    });
    await expect(
      service.url('recording', 'owner', false),
    ).rejects.toMatchObject({ status: 409 });
    prisma.meetingRecording.findUnique.mockResolvedValueOnce({
      ...recording,
      status: 'DELETED',
    });
    await expect(
      service.url('recording', 'owner', false),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('prevents a shared viewer from changing ownership-controlled metadata', async () => {
    await expect(
      service.rename('recording', 'viewer', 'New'),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.meetingRecording.update).not.toHaveBeenCalled();
  });
  it('replays the same accepted start without creating a second command', async () => {
    prisma.meetingRecordingJob.findUnique.mockResolvedValue({
      recordingId: 'recording',
      requestHash: createHash('sha256').update('speaker').digest('hex'),
    });
    await expect(service.start('join', 'cohost', {}, 'key')).resolves.toEqual({
      id: 'recording',
      status: 'COMPLETED',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    await expect(
      service.start('join', 'cohost', { layout: 'grid' }, 'key'),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('requires an idempotency key before accepting start', async () => {
    await expect(service.start('join', 'cohost', {})).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('does not stop a recording belonging to another meeting', async () => {
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        $queryRaw: jest.fn(),
        meetingRecording: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...recording, meetingId: 'other-meeting' }),
        },
      }),
    );
    await expect(
      service.stop('join', 'cohost', 'recording', 'key'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
