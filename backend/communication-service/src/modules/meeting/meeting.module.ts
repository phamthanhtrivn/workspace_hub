import { Module } from '@nestjs/common';
import { LiveKitModule } from '../../infrastructure/livekit/livekit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';

@Module({
  imports: [PrismaModule, SocketModule, LiveKitModule],
  controllers: [MeetingController],
  providers: [MeetingService],
  exports: [MeetingService],
})
export class MeetingModule {}
