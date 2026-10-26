import { Module } from '@nestjs/common';
import { LiveKitModule } from '../../infrastructure/livekit/livekit.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { DirectMessagePermissionModule } from '../direct-message/direct-message-permission.module';
import { MeetingController } from './meeting.controller';
import { MeetingLiveKitWebhookController } from './meeting-livekit-webhook.controller';
import { MeetingService } from './meeting.service';
import { MeetingAdmissionService } from './services/meeting-admission.service';
import { MeetingHistoryService } from './services/meeting-history.service';
import { MeetingHistoryPreferenceController } from './meeting-history-preference.controller';
import { MeetingHistoryPreferenceService } from './services/meeting-history-preference.service';
import { MeetingHistoryBulkService } from './services/meeting-history-bulk.service';
import { MeetingLiveKitWebhookService } from './services/meeting-livekit-webhook.service';
import { MeetingSchedulePublisher } from './events/meeting-schedule.publisher';
import { MeetingScheduleService } from './services/meeting-schedule.service';
import { MeetingParticipantService } from './services/meeting-participant.service';
import { MeetingMessageService } from './services/meeting-message.service';
import { MeetingPolicyService } from './services/meeting-policy.service';
import { MeetingPresenterService } from './services/meeting-presenter.service';
import { MeetingRealtimeService } from './services/meeting-realtime.service';
import { MeetingRoomReactionService } from './services/meeting-room-reaction.service';
import { MeetingRoomService } from './services/meeting-room.service';
import { MeetingScreenShareService } from './services/meeting-screen-share.service';
import { MeetingRecordingController } from './meeting-recording.controller';
import { MeetingRecordingService } from './services/meeting-recording.service';
import { MeetingRecordingWorker } from './services/meeting-recording.worker';
import { MeetingRecordingMediaService } from './services/meeting-recording-media.service';
import { MeetingRecordingSegmentsService } from './services/meeting-recording-segments.service';
import { MeetingRecordingRequestsService } from './services/meeting-recording-requests.service';
import { MeetingCaptionsController } from './meeting-captions.controller';
import { MeetingCaptionsService } from './services/meeting-captions.service';
import {
  MeetingSummaryController,
  MeetingSummarySourceController,
} from './meeting-summary.controller';

@Module({
  imports: [
    PrismaModule,
    SocketModule,
    LiveKitModule,
    S3Module,
    KafkaProducerModule,
    UserProfileSnapshotModule,
    DirectMessagePermissionModule,
  ],
  controllers: [
    MeetingSummaryController,
    MeetingSummarySourceController,
    MeetingHistoryPreferenceController,
    MeetingCaptionsController,
    MeetingRecordingController,
    MeetingController,
    MeetingLiveKitWebhookController,
  ],
  providers: [
    MeetingCaptionsService,
    MeetingRecordingRequestsService,
    MeetingRecordingService,
    MeetingRecordingMediaService,
    MeetingRecordingSegmentsService,
    MeetingRecordingWorker,
    MeetingService,
    MeetingRoomService,
    MeetingLiveKitWebhookService,
    MeetingHistoryService,
    MeetingHistoryPreferenceService,
    MeetingHistoryBulkService,
    MeetingParticipantService,
    MeetingMessageService,
    MeetingAdmissionService,
    MeetingPolicyService,
    MeetingPresenterService,
    MeetingRealtimeService,
    MeetingRoomReactionService,
    MeetingScreenShareService,
    MeetingScheduleService,
    MeetingSchedulePublisher,
  ],
  exports: [MeetingService],
})
export class MeetingModule {}
