import { Module, forwardRef } from '@nestjs/common';
import { LiveKitModule } from '../../infrastructure/livekit/livekit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';

@Module({
  imports: [PrismaModule, LiveKitModule, forwardRef(() => ChatModule)],
  controllers: [MeetingController],
  providers: [MeetingService],
  exports: [MeetingService],
})
export class MeetingModule {}
