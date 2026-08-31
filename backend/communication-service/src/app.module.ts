import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChannelModule } from './modules/channel/channel.module';
import { SpaceModule } from './modules/space/space.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { MessageModule } from './modules/message/message.module';
import { PrismaModule } from './prisma/prisma.module';
import { MediaModule } from './modules/media/media.module';
import { PollModule } from './modules/poll/poll.module';
import { NoteModule } from './modules/note/note.module';
import { DirectConversationModule } from './modules/direct-conversation/direct-conversation.module';
import { DirectMessageModule } from './modules/direct-message/direct-message.module';
import { UserProfileSnapshotModule } from './modules/user-profile-snapshot/user-profile-snapshot.module';
import { SocketModule } from './modules/socket/socket.module';
import { MeetingModule } from './modules/meeting/meeting.module';
import { LiveKitModule } from './infrastructure/livekit/livekit.module';

@Module({
  imports: [
    PrismaModule,
    ChannelModule,
    SpaceModule,
    InvitationModule,
    MessageModule,
    SocketModule,
    MeetingModule,
    LiveKitModule,
    MediaModule,
    PollModule,
    NoteModule,
    DirectConversationModule,
    DirectMessageModule,
    UserProfileSnapshotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
