import { MessageModule } from '../message/message.module';
import { SpaceAccessService } from './space-access.service';
import { SpaceSettingsService } from './space-settings.service';
import { SpacePresentationService } from './space-presentation.service';
import { SpaceEventPublisher } from './space-event-publisher.service';
import { ProjectSpaceProvisioningService } from './project-space-provisioning.service';
import { SpaceChannelSynchronizationService } from './space-channel-synchronization.service';
import { SpaceQueryService } from './space-query.service';
import { SpaceMembershipService } from './space-membership.service';
import { SpaceLifecycleService } from './space-lifecycle.service';
import { SpaceInvitationService } from './space-invitation.service';
import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { SpaceController } from './space.controller';
import { ProjectNameClient } from './project-name.client';
import { SpaceService } from './space.service';
import { SpaceMemberCandidatesService } from './space-member-candidates.service';

@Module({
  imports: [
    MessageModule,
    PrismaModule,
    KafkaProducerModule,
    SocketPublishingModule,
    UserProfileSnapshotModule,
  ],
  controllers: [SpaceController],
  providers: [
    SpaceService,
    SpaceAccessService,
    SpaceSettingsService,
    SpacePresentationService,
    SpaceEventPublisher,
    ProjectSpaceProvisioningService,
    SpaceChannelSynchronizationService,
    SpaceQueryService,
    SpaceMembershipService,
    SpaceLifecycleService,
    SpaceInvitationService,
    SpaceMemberCandidatesService,
    ProjectNameClient,
    HttpJsonClient,
  ],
  exports: [SpaceService],
})
export class SpaceModule {}
