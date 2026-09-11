import { Module } from '@nestjs/common';
import { LiveKitModule } from '../../infrastructure/livekit/livekit.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { MeetingController } from './meeting.controller';
import { MeetingLiveKitWebhookController } from './meeting-livekit-webhook.controller';
import { MeetingService } from './meeting.service';
import { MeetingAdmissionService } from './services/meeting-admission.service';
import { MeetingHistoryService } from './services/meeting-history.service';
import { MeetingLiveKitWebhookService } from './services/meeting-livekit-webhook.service';
import { MeetingParticipantService } from './services/meeting-participant.service';
import { MeetingMessageService } from './services/meeting-message.service';
import { MeetingPolicyService } from './services/meeting-policy.service';
import { MeetingPresenterService } from './services/meeting-presenter.service';
import { MeetingRealtimeService } from './services/meeting-realtime.service';
import { MeetingRoomService } from './services/meeting-room.service';
import { MeetingScreenShareService } from './services/meeting-screen-share.service';

@Module({
  imports: [
    PrismaModule,
    SocketModule,
    LiveKitModule,
    S3Module,
    UserProfileSnapshotModule,
  ],
  controllers: [MeetingController, MeetingLiveKitWebhookController],
  providers: [
    MeetingService,
    MeetingRoomService,
    MeetingLiveKitWebhookService,
    MeetingHistoryService,
    MeetingParticipantService,
    MeetingMessageService,
    MeetingAdmissionService,
    MeetingPolicyService,
    MeetingPresenterService,
    MeetingRealtimeService,
    MeetingScreenShareService,
  ],
  exports: [MeetingService],
})
export class MeetingModule {}
