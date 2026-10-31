import { DirectMessageAccessService } from './direct-message-access.service';
import { DirectMessagePresentationService } from './direct-message-presentation.service';
import { DirectMessageQueryService } from './direct-message-query.service';
import { DirectMessageEventPublisher } from './direct-message-event-publisher.service';
import { DirectMessageMutationService } from './direct-message-mutation.service';
import { ConversationAiModule } from '../conversation-ai/conversation-ai.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { DirectMessageController } from './direct-message.controller';
import { DirectMessageService } from './direct-message.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { DirectMessagePermissionModule } from './direct-message-permission.module';

@Module({
  imports: [
    ConversationAiModule,
    PrismaModule,
    S3Module,
    KafkaProducerModule,
    UserProfileSnapshotModule,
    DirectMessagePermissionModule,
    SocketPublishingModule,
  ],
  controllers: [DirectMessageController],
  providers: [
    DirectMessageService,
    DirectMessageAccessService,
    DirectMessagePresentationService,
    DirectMessageQueryService,
    DirectMessageEventPublisher,
    DirectMessageMutationService,
  ],
  exports: [DirectMessageService],
})
export class DirectMessageModule {}
