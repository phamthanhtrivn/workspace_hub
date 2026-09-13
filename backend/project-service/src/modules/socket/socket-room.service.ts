import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketRoomService {
  user(userId: string): string {
    return `project:user:${userId}`;
  }

  project(projectId: string): string {
    return `project:${projectId}`;
  }
}
