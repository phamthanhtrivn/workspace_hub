import { Injectable } from '@nestjs/common';
import { SocketEventEmitter } from './socket-event-emitter';
import { SocketRoomService } from './socket-room.service';
import { ProjectChangedEvent, ProjectSocketEvent } from './project-socket.types';

@Injectable()
export class ProjectSocketPublisher {
  constructor(
    private readonly events: SocketEventEmitter,
    private readonly rooms: SocketRoomService,
  ) {}

  publish(event: ProjectChangedEvent, targetUserIds: string[] = []): void {
    this.events.emitToRooms(this.rooms.project(event.projectId), ProjectSocketEvent.CHANGED, event);
    for (const userId of new Set(targetUserIds)) {
      this.events.emitToUser(userId, ProjectSocketEvent.CHANGED, event);
    }
    if (event.resource === 'MEMBER' && event.action === 'DELETED') {
      for (const userId of new Set(targetUserIds)) {
        this.events.removeUserFromRoom(userId, this.rooms.project(event.projectId));
      }
    }
  }
}
