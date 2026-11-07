import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { MediaAccessService } from './media-access.service';
import { DirectMessagePermissionModule } from '../direct-message/direct-message-permission.module';
import { MeetingPolicyService } from '../meeting/services/meeting-policy.service';
import { VoiceTranscriptService } from './voice-transcript.service';
import {
  VoiceTranscriptController,
  VoiceTranscriptSourceController,
} from './voice-transcript.controller';

@Module({
  imports: [S3Module, DirectMessagePermissionModule],
  controllers: [
    MediaController,
    VoiceTranscriptController,
    VoiceTranscriptSourceController,
  ],
  providers: [
    MediaService,
    MediaAccessService,
    MeetingPolicyService,
    VoiceTranscriptService,
  ],
  exports: [MediaService],
})
export class MediaModule {}
