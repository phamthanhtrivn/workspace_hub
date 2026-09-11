import { MeetingParticipantStatus, MeetingRole } from '@prisma/client';
import {
  canBypassMeetingPassword,
  canJoinLockedMeeting,
} from './meeting.utils';

describe('meeting access utilities', () => {
  const baseParams = {
    hostId: 'host-user-id',
    userId: 'guest-user-id',
    role: MeetingRole.PARTICIPANT,
  };

  it('does not let approved participants bypass approval or password by default', () => {
    const params = {
      ...baseParams,
      participantStatus: MeetingParticipantStatus.APPROVED,
    };

    expect(canJoinLockedMeeting(params)).toBe(false);
    expect(canBypassMeetingPassword(params)).toBe(false);
  });

  it('lets participants who already joined bypass password when rejoining', () => {
    expect(
      canBypassMeetingPassword({
        ...baseParams,
        participantStatus: MeetingParticipantStatus.LEFT,
      }),
    ).toBe(true);
  });

  it('lets meeting moderators bypass password', () => {
    expect(
      canBypassMeetingPassword({
        ...baseParams,
        userId: baseParams.hostId,
        role: MeetingRole.HOST,
      }),
    ).toBe(true);
  });
});
