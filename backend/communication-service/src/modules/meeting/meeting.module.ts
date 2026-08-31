import { Module } from '@nestjs/common';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [SocketModule],
  providers: [],
  exports: [],
})
export class MeetingModule {}
