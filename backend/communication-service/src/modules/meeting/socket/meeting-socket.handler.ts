import { Injectable } from '@nestjs/common';
import { SocketEventEmitter } from '../../socket/services/socket-event-emitter';
import { SocketRoomService } from '../../socket/services/socket-room.service';

@Injectable()
export class MeetingSocketHandler {
  constructor(
    private readonly socketEventEmitter: SocketEventEmitter,
    private readonly socketRoomService: SocketRoomService,
  ) {}

  getMeetingRoom(meetingId: string): string {
    return this.socketRoomService.meeting(meetingId);
  }

  getMeetingLobbyRoom(meetingId: string): string {
    return this.socketRoomService.meetingLobby(meetingId);
  }

  emitToMeeting<TPayload>(
    meetingId: string,
    event: string,
    payload: TPayload,
  ): void {
    this.socketEventEmitter.emitToRooms(
      this.getMeetingRoom(meetingId),
      event,
      payload,
    );
  }
}
