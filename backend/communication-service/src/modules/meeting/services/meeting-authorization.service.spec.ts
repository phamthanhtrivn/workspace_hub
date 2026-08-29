import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingParticipantStatus, MeetingRole } from '@prisma/client';
import { MeetingAuthorizationService } from './meeting-authorization.service';
import { MeetingErrorMessage } from '../types/meeting.enums';

describe('MeetingAuthorizationService', () => {
  const prisma = {
    meeting: {
      findUnique: jest.fn(),
    },
    meetingParticipant: {
      findUnique: jest.fn(),
    },
  };
  let service: MeetingAuthorizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeetingAuthorizationService(prisma as any);
  });

  it('allows the primary host as moderator', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      participants: [],
    });

    await expect(
      service.assertModerator('meeting-1', 'host-1'),
    ).resolves.toMatchObject({ id: 'meeting-1', hostId: 'host-1' });
  });

  it('allows a joined co-host as moderator', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      participants: [
        {
          userId: 'cohost-1',
          role: MeetingRole.COHOST,
          status: MeetingParticipantStatus.JOINED,
        },
      ],
    });

    await expect(
      service.assertModerator('meeting-1', 'cohost-1'),
    ).resolves.toMatchObject({ id: 'meeting-1', hostId: 'host-1' });
  });

  it('rejects regular participants as moderators', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      participants: [
        {
          userId: 'user-1',
          role: MeetingRole.PARTICIPANT,
          status: MeetingParticipantStatus.JOINED,
        },
      ],
    });

    await expect(
      service.assertModerator('meeting-1', 'user-1'),
    ).rejects.toThrow(
      new ForbiddenException(MeetingErrorMessage.MODERATOR_REQUIRED),
    );
  });

  it('rejects co-hosts that are not joined', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      participants: [
        {
          userId: 'cohost-1',
          role: MeetingRole.COHOST,
          status: MeetingParticipantStatus.LEFT,
        },
      ],
    });

    await expect(
      service.assertModerator('meeting-1', 'cohost-1'),
    ).rejects.toThrow(MeetingErrorMessage.MODERATOR_REQUIRED);
  });

  it('throws not found when meeting does not exist', async () => {
    prisma.meeting.findUnique.mockResolvedValue(null);

    await expect(
      service.assertModerator('missing-meeting', 'user-1'),
    ).rejects.toThrow(
      new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND),
    );
  });

  it('keeps host-only checks restricted to the primary host', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
    });

    await expect(service.assertHost('meeting-1', 'host-1')).resolves.toEqual({
      id: 'meeting-1',
      hostId: 'host-1',
    });
    await expect(service.assertHost('meeting-1', 'cohost-1')).rejects.toThrow(
      MeetingErrorMessage.HOST_REQUIRED,
    );
  });
});
