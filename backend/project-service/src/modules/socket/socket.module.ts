import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProjectSocketInterceptor } from './project-socket.interceptor';
import { ProjectGateway } from './project.gateway';
import { ProjectSocketPublisher } from './project-socket.publisher';
import { SocketEventEmitter } from './socket-event-emitter';
import { SocketRoomService } from './socket-room.service';

@Module({
  providers: [
    ProjectGateway,
    SocketEventEmitter,
    SocketRoomService,
    ProjectSocketPublisher,
    { provide: APP_INTERCEPTOR, useClass: ProjectSocketInterceptor },
  ],
  exports: [SocketEventEmitter, SocketRoomService, ProjectSocketPublisher],
})
export class SocketModule {}
