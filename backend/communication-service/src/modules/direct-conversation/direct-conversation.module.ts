import { Module, forwardRef } from '@nestjs/common';
import { SocketModule } from '../socket/socket.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DirectConversationController } from './direct-conversation.controller';
import { DirectConversationService } from './direct-conversation.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { DirectMessagePermissionModule } from '../direct-message/direct-message-permission.module';
import { DirectMessagePrivacyConsumer } from './direct-message-privacy.consumer';

@Module({
  imports: [
    forwardRef(() => SocketModule),
    PrismaModule,
    UserProfileSnapshotModule,
    DirectMessagePermissionModule,
  ],
  controllers: [DirectConversationController, DirectMessagePrivacyConsumer],
  providers: [DirectConversationService],
  exports: [DirectConversationService],
})
export class DirectConversationModule {}
