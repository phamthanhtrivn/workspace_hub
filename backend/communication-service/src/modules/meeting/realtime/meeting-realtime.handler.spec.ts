import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
} from '@prisma/client';
import { Socket } from 'socket.io';
import { CHAT_RESPONSE_STATUS } from '../../chat/types/chat.enums';
import { MeetingRealtimeHandler } from './meeting-realtime.handler';
import {
  getMeetingModeratorRoom,
  getMeetingParticipantRoom,
  getMeetingRealtimeRooms,
  getMeetingUserRoom,
} from '../utils/meeting-room.util';

describe('MeetingRealtimeHandler', () => {
  const prisma = {
    meeting: {
      findUnique: jest.fn(),
    },
  };
  const socket = {
    join: jest.fn(),
    leave: jest.fn(),
  } as Pick<Socket, 'join' | 'leave'>;
  let handler: MeetingRealtimeHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new MeetingRealtimeHandler(prisma as any);
  });

  it('joins moderator rooms for joined co-hosts', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      status: MeetingStatus.LIVE,
      participants: [
        {
          userId: 'cohost-1',
          role: MeetingRole.COHOST,
          status: MeetingParticipantStatus.JOINED,
        },
      ],
    });

    await expect(
      handler.joinControlRooms('meeting-1', 'cohost-1', socket as Socket),
    ).resolves.toEqual({
      status: CHAT_RESPONSE_STATUS.JOINED,
      meetingId: 'meeting-1',
      isModerator: true,
    });
    expect(socket.join).toHaveBeenCalledWith(
      getMeetingUserRoom('meeting-1', 'cohost-1'),
    );
    expect(socket.join).toHaveBeenCalledWith(
      getMeetingParticipantRoom('meeting-1'),
    );
    expect(socket.join).toHaveBeenCalledWith(
      getMeetingModeratorRoom('meeting-1'),
    );
  });

  it('does not join moderator room for regular participants', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      status: MeetingStatus.LIVE,
      participants: [
        {
          userId: 'user-1',
          role: MeetingRole.PARTICIPANT,
          status: MeetingParticipantStatus.JOINED,
        },
      ],
    });

    const response = await handler.joinControlRooms(
      'meeting-1',
      'user-1',
      socket as Socket,
    );

    expect(response.isModerator).toBe(false);
    expect(socket.join).toHaveBeenCalledWith(
      getMeetingParticipantRoom('meeting-1'),
    );
    expect(socket.join).not.toHaveBeenCalledWith(
      getMeetingModeratorRoom('meeting-1'),
    );
  });

  it('rejects removed participants from meeting realtime rooms', async () => {
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'meeting-1',
      hostId: 'host-1',
      status: MeetingStatus.LIVE,
      participants: [
        {
          userId: 'user-1',
          role: MeetingRole.PARTICIPANT,
          status: MeetingParticipantStatus.REMOVED,
        },
      ],
    });

    await expect(
      handler.joinControlRooms('meeting-1', 'user-1', socket as Socket),
    ).resolves.toMatchObject({ status: CHAT_RESPONSE_STATUS.ERROR });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('leaves all meeting realtime rooms for the user', () => {
    const response = handler.leaveControlRooms(
      'meeting-1',
      'user-1',
      socket as Socket,
    );

    expect(response).toEqual({
      status: CHAT_RESPONSE_STATUS.SUCCESS,
      meetingId: 'meeting-1',
    });
    for (const room of getMeetingRealtimeRooms('meeting-1', 'user-1')) {
      expect(socket.leave).toHaveBeenCalledWith(room);
    }
  });
});
