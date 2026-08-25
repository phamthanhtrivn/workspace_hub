import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChannelModule } from './modules/channel/channel.module';
import { SpaceModule } from './modules/space/space.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { MessageModule } from './modules/message/message.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './modules/chat/chat.module';
import { MediaModule } from './modules/media/media.module';
import { PollModule } from './modules/poll/poll.module';
import { NoteModule } from './modules/note/note.module';
import { DirectConversationModule } from './modules/direct-conversation/direct-conversation.module';
import { DirectMessageModule } from './modules/direct-message/direct-message.module';
import { UserProfileSnapshotModule } from './modules/user-profile-snapshot/user-profile-snapshot.module';
import { LiveKitModule } from './infrastructure/livekit/livekit.module';
import { MeetingModule } from './modules/meeting/meeting.module';

@Module({
  imports: [
    PrismaModule,
    ChannelModule,
    SpaceModule,
    InvitationModule,
    MessageModule,
    ChatModule,
    MediaModule,
    PollModule,
    NoteModule,
    DirectConversationModule,
    DirectMessageModule,
    UserProfileSnapshotModule,
    LiveKitModule,
    MeetingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
