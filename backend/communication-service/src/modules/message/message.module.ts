import { SystemMessageService } from './system-message.service';
import { MessageQueryService } from './message-query.service';
import { MessageMutationService } from './message-mutation.service';
import { MessagePresentationService } from './message-presentation.service';
import { MessagePublishingService } from './message-publishing.service';
import { ConversationAiModule } from '../conversation-ai/conversation-ai.module';
import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';

import { MessageService } from './message.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { SocketPublishingModule } from '../socket/socket-publishing.module';

@Module({
  imports: [
    ConversationAiModule,
    PrismaModule,
    S3Module,
    UserProfileSnapshotModule,
    SocketPublishingModule,
  ],
  controllers: [MessageController],
  providers: [
    SystemMessageService,
    MessageService,
    MessageQueryService,
    MessageMutationService,
    MessagePresentationService,
    MessagePublishingService,
  ],
  exports: [MessageService, SystemMessageService],
})
export class MessageModule {}
