import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';

@Injectable()
export class SocketEventEmitter {
  private server?: Server;

  constructor(private readonly socketRoomService: SocketRoomService) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToRooms<TPayload>(
    rooms: string | string[],
    event: string,
    payload: TPayload,
  ): void {
    this.server?.to(rooms).emit(event, payload);
  }

  emitToUser<TPayload>(userId: string, event: string, payload: TPayload): void {
    this.emitToRooms(this.socketRoomService.user(userId), event, payload);
  }

  leaveRoom(room: string): void {
    this.server?.in(room).socketsLeave(room);
  }

  getServer(): Server | undefined {
    return this.server;
  }
}
