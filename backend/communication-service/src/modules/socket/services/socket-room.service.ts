import { Injectable } from '@nestjs/common';
import { SocketRoomPrefix } from '../types/socket-room.enums';

@Injectable()
export class SocketRoomService {
  user(userId: string): string {
    return this.build(SocketRoomPrefix.USER, userId);
  }

  channel(channelId: string): string {
    return this.build(SocketRoomPrefix.CHANNEL, channelId);
  }

  directConversation(conversationId: string): string {
    return this.build(SocketRoomPrefix.DIRECT_CONVERSATION, conversationId);
  }

  meeting(meetingId: string): string {
    return this.build(SocketRoomPrefix.MEETING, meetingId);
  }

  meetingLobby(meetingId: string): string {
    return this.build(SocketRoomPrefix.MEETING_LOBBY, meetingId);
  }

  private build(prefix: SocketRoomPrefix, id: string): string {
    return `${prefix}:${id}`;
  }
}
