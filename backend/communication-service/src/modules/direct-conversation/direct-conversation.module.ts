import { Module, forwardRef } from '@nestjs/common';
import { SocketModule } from '../socket/socket.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DirectConversationController } from './direct-conversation.controller';
import { DirectConversationService } from './direct-conversation.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    forwardRef(() => SocketModule),
    PrismaModule,
    UserProfileSnapshotModule,
  ],
  controllers: [DirectConversationController],
  providers: [DirectConversationService],
  exports: [DirectConversationService],
})
export class DirectConversationModule {}
