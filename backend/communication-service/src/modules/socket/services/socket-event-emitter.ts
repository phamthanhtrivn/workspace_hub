import { ChatEvent } from '../chat/chat-socket.events';
import { ChannelAccessService } from '../../channel/access/channel-access.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { emitWithActiveSessions } from '../../../common/auth/socket-session';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';
import { MeetingEvent } from '../meeting/meeting-socket.events';
import { MeetingParticipantStatus, MeetingStatus } from '@prisma/client';

const MEMBERSHIP_REMOVAL_EVENTS: ReadonlySet<string> = new Set([
  ChatEvent.MEMBER_KICKED,
  ChatEvent.MEMBER_LEFT,
]);
const MEETING_END_EVENTS: ReadonlySet<string> = new Set([
  MeetingEvent.ENDED,
  MeetingEvent.STATUS_UPDATED,
]);
const MEETING_DEPARTURE_STATUSES: ReadonlyMap<
  string,
  MeetingParticipantStatus
> = new Map([
  [MeetingEvent.PARTICIPANT_REMOVED, MeetingParticipantStatus.REMOVED],
  [MeetingEvent.PARTICIPANT_LEFT, MeetingParticipantStatus.LEFT],
]);

@Injectable()
export class SocketEventEmitter {
  private server?: Server;

  constructor(
    private readonly socketRoomService: SocketRoomService,
    private readonly access: ChannelAccessService,
    private readonly prisma: PrismaService,
  ) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToRooms<TPayload>(
    rooms: string | string[],
    event: string,
    payload: TPayload,
    meetingId?: string,
  ): void {
    const context = payload as Record<string, unknown>;
    const removal = MEMBERSHIP_REMOVAL_EVENTS.has(event);
    void emitWithActiveSessions(
      this.server,
      rooms,
      event,
      payload,
      async (userId) => {
        if (meetingId) {
          const participant = await this.prisma.meetingParticipant.findUnique({
            where: { meetingId_userId: { meetingId, userId } },
            select: {
              status: true,
              joinedAt: true,
              meeting: { select: { status: true } },
            },
          });
          // End is emitted after the transaction marks joined participants as LEFT.
          const ended = MEETING_END_EVENTS.has(event);
          const departedAtEnd =
            ended &&
            participant?.status === MeetingParticipantStatus.LEFT &&
            participant.joinedAt &&
            participant.meeting.status === MeetingStatus.ENDED;
          const departureStatus = MEETING_DEPARTURE_STATUSES.get(event);
          const ownDeparture =
            departureStatus &&
            context.userId === userId &&
            participant?.status === departureStatus;
          if (
            participant?.status !== MeetingParticipantStatus.JOINED &&
            !departedAtEnd &&
            !ownDeparture
          )
            throw new Error('Not a joined meeting participant');
        }
        if (removal) return;
        if (typeof context.channelId === 'string')
          await this.access.assertPrivateAccess(context.channelId, userId);
        if (typeof context.conversationId === 'string') {
          const participant =
            await this.prisma.directConversationParticipant.findUnique({
              where: {
                conversationId_userId: {
                  conversationId: context.conversationId,
                  userId,
                },
              },
            });
          if (!participant) throw new Error('Not a participant');
        }
      },
    ).catch(() => undefined);
  }

  emitToUser<TPayload>(userId: string, event: string, payload: TPayload): void {
    this.emitToRooms(this.socketRoomService.user(userId), event, payload);
  }

  leaveRoom(room: string): void {
    this.server?.in(room).socketsLeave(room);
  }

  removeUserFromRoom(userId: string, room: string): void {
    this.server
      ?.in([userId, this.socketRoomService.user(userId)])
      .socketsLeave(room);
  }

  getServer(): Server | undefined {
    return this.server;
  }
}
