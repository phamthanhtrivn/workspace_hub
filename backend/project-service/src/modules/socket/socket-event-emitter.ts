import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';

@Injectable()
export class SocketEventEmitter {
  private server?: Server;

  constructor(private readonly rooms: SocketRoomService) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToRooms<T>(rooms: string | string[], event: string, payload: T): void {
    this.server?.to(rooms).emit(event, payload);
  }

  emitToUser<T>(userId: string, event: string, payload: T): void {
    this.emitToRooms(this.rooms.user(userId), event, payload);
  }

  removeUserFromRoom(userId: string, room: string): void {
    this.server?.in(this.rooms.user(userId)).socketsLeave(room);
  }
}
