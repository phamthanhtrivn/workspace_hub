import { Module } from '@nestjs/common';
import { SocketModule } from '../socket/socket.module';
import { MeetingSocketHandler } from './socket/meeting-socket.handler';

@Module({
  imports: [SocketModule],
  providers: [MeetingSocketHandler],
  exports: [MeetingSocketHandler],
})
export class MeetingModule {}
