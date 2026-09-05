import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MeetingParticipantService } from './meeting-participant.service';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingPresenterService } from './meeting-presenter.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

describe('MeetingParticipantService', () => {
  const joinToken = 'join-token';
  const userId = '3d3538b6-3a0d-44a4-9979-fec1ff2b5c11';
  const meetingId = 'd4b80433-ad39-4e45-b79b-1e94fe8d0b95';
  const participantId = '4f1a13da-f866-4fc5-86b9-ad5a8c78f69b';

  function createService(chatMuted = true) {
    const updateMeetingParticipant = jest.fn().mockResolvedValue({
      chatMuted,
    });
    const prisma = {
      meetingParticipant: {
        update: updateMeetingParticipant,
      },
    } as unknown as PrismaService;
    const meetingPolicyService = {
      assertJoinedMeetingParticipant: jest.fn().mockResolvedValue({
        meeting: { id: meetingId, joinToken },
        participant: { id: participantId },
      }),
    } as unknown as jest.Mocked<MeetingPolicyService>;
    const meetingRealtimeService = {
      emitUserEvent: jest.fn(),
    } as unknown as jest.Mocked<MeetingRealtimeService>;
    const service = new MeetingParticipantService(
      prisma,
      {} as UserProfileSnapshotService,
      meetingPolicyService,
      {} as MeetingPresenterService,
      meetingRealtimeService,
    );

    return {
      meetingPolicyService,
      meetingRealtimeService,
      service,
      updateMeetingParticipant,
    };
  }

  it('mutes meeting chat notifications for a joined participant', async () => {
    const {
      meetingPolicyService,
      meetingRealtimeService,
      service,
      updateMeetingParticipant,
    } = createService(true);

    const result = await service.updateChatNotificationPreference({
      joinToken,
      userId,
      dto: { chatMuted: true },
    });

    expect(
      meetingPolicyService.assertJoinedMeetingParticipant,
    ).toHaveBeenCalledWith({
      joinToken,
      userId,
    });
    expect(updateMeetingParticipant).toHaveBeenCalledWith({
      where: { id: participantId },
      data: { chatMuted: true },
    });
    expect(result).toEqual({
      meetingId,
      joinToken,
      userId,
      chatMuted: true,
    });
    expect(meetingRealtimeService.emitUserEvent).toHaveBeenCalledWith(
      userId,
      MeetingEvent.CHAT_NOTIFICATION_PREFERENCE_UPDATED,
      result,
    );
  });

  it('unmutes meeting chat notifications for a joined participant', async () => {
    const { service, updateMeetingParticipant } = createService(false);

    const result = await service.updateChatNotificationPreference({
      joinToken,
      userId,
      dto: { chatMuted: false },
    });

    expect(updateMeetingParticipant).toHaveBeenCalledWith({
      where: { id: participantId },
      data: { chatMuted: false },
    });
    expect(result.chatMuted).toBe(false);
  });

  it('lets the joined participant policy reject invalid meeting access', async () => {
    const { meetingPolicyService, service, updateMeetingParticipant } =
      createService();
    const error = new ForbiddenException('not joined');
    meetingPolicyService.assertJoinedMeetingParticipant.mockRejectedValue(
      error,
    );

    await expect(
      service.updateChatNotificationPreference({
        joinToken,
        userId,
        dto: { chatMuted: true },
      }),
    ).rejects.toBe(error);
    expect(updateMeetingParticipant).not.toHaveBeenCalled();
  });
});
