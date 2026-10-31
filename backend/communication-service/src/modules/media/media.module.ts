import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { MediaAccessService } from './media-access.service';
import { DirectMessagePermissionModule } from '../direct-message/direct-message-permission.module';
import { MeetingPolicyService } from '../meeting/services/meeting-policy.service';

@Module({
  imports: [S3Module, DirectMessagePermissionModule],
  controllers: [MediaController],
  providers: [MediaService, MediaAccessService, MeetingPolicyService],
  exports: [MediaService],
})
export class MediaModule {}
