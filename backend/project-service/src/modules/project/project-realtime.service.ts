import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ProjectChangedEvent, ProjectSocketEvent } from './project-socket.types';

@Injectable()
export class ProjectRealtimeService {
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  publish(event: ProjectChangedEvent, targetUserIds: string[] = []): void {
    if (!this.server) return;

    this.server.to(this.projectRoom(event.projectId)).emit(ProjectSocketEvent.CHANGED, event);
    for (const userId of new Set(targetUserIds)) {
      this.server.to(this.userRoom(userId)).emit(ProjectSocketEvent.CHANGED, event);
    }
    if (event.resource === 'MEMBER' && event.action === 'DELETED') {
      for (const userId of new Set(targetUserIds)) {
        this.server.in(this.userRoom(userId)).socketsLeave(this.projectRoom(event.projectId));
      }
    }
  }

  projectRoom(projectId: string): string {
    return `project:${projectId}`;
  }

  userRoom(userId: string): string {
    return `project:user:${userId}`;
  }
}
