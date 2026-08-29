import { Module, forwardRef } from '@nestjs/common';
import { LiveKitModule } from '../../infrastructure/livekit/livekit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { MeetingController } from './meeting.controller';
import { MeetingLiveKitService } from './livekit/meeting-livekit.service';
import { MeetingRealtimePublisher } from './realtime/meeting-realtime.publisher';
import { MeetingAuthorizationService } from './services/meeting-authorization.service';
import { MeetingService } from './meeting.service';

@Module({
  imports: [
    PrismaModule,
    LiveKitModule,
    UserProfileSnapshotModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingAuthorizationService,
    MeetingRealtimePublisher,
    MeetingLiveKitService,
  ],
  exports: [MeetingService],
})
export class MeetingModule {}
