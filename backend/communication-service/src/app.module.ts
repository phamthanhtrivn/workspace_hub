import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MessageModule } from './modules/message/message.module';
import { PollModule } from './modules/poll/poll.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './modules/chat/chat.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { S3Module } from './modules/s3/s3.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    PrismaModule,
    ConversationModule, 
    MessageModule, 
    PollModule,
    ChatModule,
    InvitationModule,
    S3Module,
    MediaModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
