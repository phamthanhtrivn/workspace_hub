import { Module } from '@nestjs/common';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DirectConversationController } from './direct-conversation.controller';
import { DirectConversationService } from './direct-conversation.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { DirectMessagePermissionModule } from '../direct-message/direct-message-permission.module';
import { DirectMessagePrivacyConsumer } from './direct-message-privacy.consumer';

@Module({
  imports: [
    SocketPublishingModule,
    PrismaModule,
    UserProfileSnapshotModule,
    DirectMessagePermissionModule,
  ],
  controllers: [DirectConversationController, DirectMessagePrivacyConsumer],
  providers: [DirectConversationService],
  exports: [DirectConversationService],
})
export class DirectConversationModule {}
